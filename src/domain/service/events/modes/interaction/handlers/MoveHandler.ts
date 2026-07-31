import { BaseShape } from '@/shape/BaseShape';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { LineProperty } from '@/shape/property/LineProperty';
import {
	BasePropertyValue,
	LinePropertyValue,
	ShapeData,
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
} from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { UpdatePropsAction } from '@/domain/service/action/Actions/UpdatePropsAction';
import { isPointInRect } from '@/shape/geometry';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IocContainerService } from '@/common/contract';

const DRAG_THRESHOLD = 3;

@provide(IHandlerWithInteraction)
export class MoveHandler implements IHandler {
	public type: HandlerEnum = HandlerEnum.Move;
	public sort = 40;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	private isDragging = false;
	private movingShapes: BaseShape[] = [];
	private startScreenPoint: Point | null = null;
	private startViewportPoint: Point | null = null;
	private originBasePropsMap: Map<string, BasePropertyValue> = new Map();
	private originLinePropsMap: Map<string, LinePropertyValue> = new Map();

	public enable(state: InteractionState): boolean {
		return state.selectedShapes.length > 0;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointerdown':
				return this.handlePointerDown(state, payload);
			case 'pointermove':
				if (e.buttons !== 1) {
					if (this.isDragging) {
						const restoreState =
							this.movingShapes.length > 1 ? ShapeStateEnum.MultiSelected : ShapeStateEnum.Selected;
						this.movingShapes.forEach((s) => s.setState(restoreState));
					}
					if (this.startScreenPoint || this.isDragging) {
						this.reset();
					}
					return true;
				}
				return this.handlePointerMove(state, payload);
			case 'pointerup':
				return this.handlePointerUp(state);
			default:
				return true;
		}
	}

	private handlePointerDown(state: InteractionState, payload: EventPayload): boolean {
		const worldPoint = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const shapeUnderCursor = this.shapeManager.getShapeByPoint(worldPoint);
		const isOnSelected =
			shapeUnderCursor && state.selectedShapes.some((s) => s.id === shapeUnderCursor.id);

		const isOnOverlay = this.isPointOnOverlay(payload);

		if (!isOnSelected && !isOnOverlay) {
			return true;
		}

		this.originBasePropsMap.clear();
		this.originLinePropsMap.clear();
		for (const shape of state.selectedShapes) {
			const p = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
			if (p) {
				this.originBasePropsMap.set(shape.id, { ...p });
			}
			// 线的 start/end/途经点是世界坐标，移动时需要一并平移，否则数据与容器位置脱节
			if (shape.type === ShapeTypeEnum.Line) {
				const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line)?.get();
				if (line) {
					this.originLinePropsMap.set(shape.id, {
						...line,
						start: { ...line.start },
						end: { ...line.end },
						midPoints: line.midPoints?.map((mp) => ({ ...mp })),
					});
				}
			}
		}
		this.startScreenPoint = payload.screenPoint;
		this.startViewportPoint = worldPoint;
		return true;
	}

	private isPointOnOverlay(payload: EventPayload): boolean {
		const rect = this.selectService.getMultiSelectOverlayRect();
		if (!rect) {
			return false;
		}
		const local = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		// 扩展 4px 匹配 overlay 绘制的 offset
		const expanded = {
			x: rect.x - 4,
			y: rect.y - 4,
			width: rect.width + 8,
			height: rect.height + 8,
		};
		return isPointInRect({ x: local.x, y: local.y }, expanded);
	}

	private handlePointerMove(state: InteractionState, payload: EventPayload): boolean {
		if (this.isDragging) {
			document.body.style.cursor = 'grabbing';
			this.applyMove(payload.viewportPoint);
			return false;
		}

		if (this.startScreenPoint && this.originBasePropsMap.size > 0) {
			const dx = payload.screenPoint.x - this.startScreenPoint.x;
			const dy = payload.screenPoint.y - this.startScreenPoint.y;

			if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
				return true;
			}

			this.actionLogManager.setStreamStart();

			this.isDragging = true;
			this.movingShapes = [...state.selectedShapes];
			this.movingShapes.forEach((s) => s.setState(ShapeStateEnum.Moving));
			document.body.style.cursor = 'grabbing';
			return false;
		}

		return true;
	}

	private handlePointerUp(_state: InteractionState): boolean {
		if (this.isDragging) {
			this.actionLogManager.setStreamEnd();

			const restoreState =
				this.movingShapes.length > 1 ? ShapeStateEnum.MultiSelected : ShapeStateEnum.Selected;
			this.movingShapes.forEach((s) => s.setState(restoreState));
			this.reset();
			document.body.style.cursor = 'default';
			return false;
		}

		this.reset();
		document.body.style.cursor = 'default';
		return true;
	}

	private applyMove(viewportPoint: Point) {
		if (!this.startViewportPoint) {
			return;
		}

		const currentViewportPoint = this.viewportService.clientToViewportLocal(
			viewportPoint.x,
			viewportPoint.y,
		);
		const dx = currentViewportPoint.x - this.startViewportPoint.x;
		const dy = currentViewportPoint.y - this.startViewportPoint.y;

		const shapeDatas: ShapeData[] = [];
		for (const shape of this.movingShapes) {
			const origin = this.originBasePropsMap.get(shape.id);
			if (!origin) {
				continue;
			}

			const properties: ShapeData['properties'] = {
				base: { ...origin, x: origin.x + dx, y: origin.y + dy },
			};

			const originLine = this.originLinePropsMap.get(shape.id);
			if (originLine) {
				properties.line = {
					...originLine,
					start: { ...originLine.start, x: originLine.start.x + dx, y: originLine.start.y + dy },
					end: { ...originLine.end, x: originLine.end.x + dx, y: originLine.end.y + dy },
					midPoints: originLine.midPoints?.map((mp) => ({ x: mp.x + dx, y: mp.y + dy })),
				};
			}

			shapeDatas.push({ id: shape.id, type: shape.type, properties });
		}

		this.actionManager.push(new UpdatePropsAction(shapeDatas, this.ioc));

		this.selectService.updateMultiSelectOverlay(this.movingShapes);
	}

	private reset() {
		this.isDragging = false;
		this.movingShapes = [];
		this.startScreenPoint = null;
		this.startViewportPoint = null;
		this.originBasePropsMap.clear();
		this.originLinePropsMap.clear();
	}
}
