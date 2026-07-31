import { BaseShape } from '@/shape/BaseShape';
import { LineProperty } from '@/shape/property/LineProperty';
import {
	LineEndpointValue,
	LinePropertyValue,
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
} from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { UpdatePropsAction } from '@/domain/service/action/Actions/UpdatePropsAction';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { IViewportService } from '@/domain/contract/ViewportService';
import { IShapeManager } from '@/domain/contract';
import { getShapeAnchorPoint } from '@/shape/geometry';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IocContainerService } from '@/common/contract';

const HANDLE_HIT_RADIUS = 8;
const DOUBLE_CLICK_MS = 300;

/** 拖拽目标：端点或第 index 个途经点 */
type DragTarget = { kind: 'start' } | { kind: 'end' } | { kind: 'mid'; index: number };

/**
 * 线编辑：拖拽起终点、拖拽途经点、拖拽虚拟中点手柄插入途经点、双击途经点删除。
 * 必须注册在 Select/Move 之前：手柄可能位于线包围盒之外，否则会被误判为点击空白。
 */
@provide(IHandlerWithInteraction)
export class LineEditHandler implements IHandler {
	public type: HandlerEnum.LineEdit = HandlerEnum.LineEdit;
	public sort: number = 10;

	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	private isDragging = false;
	private draggingShape: BaseShape | null = null;
	private dragTarget: DragTarget | null = null;

	private lastDownTime = 0;
	private lastDownMidIndex: number | null = null;

	public enable(state: InteractionState): boolean {
		return state.selectedShapes.length === 1 && state.selectedShapes[0].type === ShapeTypeEnum.Line;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointerdown':
				return this.handlePointerDown(state, payload);
			case 'pointermove':
				if (e.buttons !== 1 && this.isDragging) {
					this.finishDrag(state);
				}
				return this.handlePointerMove(state, payload);
			case 'pointerup':
				return this.handlePointerUp(state);
			default:
				return true;
		}
	}

	private handlePointerDown(state: InteractionState, payload: EventPayload): boolean {
		const shape = state.selectedShapes[0];
		const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
		const point = this.toWorldPoint(payload);
		const threshold = HANDLE_HIT_RADIUS / payload.scale;

		const target = this.detectTarget(line, point, threshold);

		// 双击途经点 → 删除
		if (target?.kind === 'mid') {
			const now = Date.now();
			const isDoubleClick =
				now - this.lastDownTime < DOUBLE_CLICK_MS && this.lastDownMidIndex === target.index;
			this.lastDownTime = now;
			this.lastDownMidIndex = target.index;

			if (isDoubleClick) {
				this.removeMidPoint(shape, line, target.index);
				this.lastDownMidIndex = null;
				return false;
			}
		} else {
			this.lastDownMidIndex = null;
		}

		if (target) {
			this.actionLogManager.setStreamStart();
			this.isDragging = true;
			this.draggingShape = shape;
			this.dragTarget = target;
			shape.setState(ShapeStateEnum.Resizing);
			return false;
		}

		// 虚拟中点手柄 → 插入途经点并立即进入拖拽
		const virtualIndex = this.detectVirtualHandle(line, point, threshold);
		if (virtualIndex !== null) {
			this.actionLogManager.setStreamStart();
			this.isDragging = true;
			this.draggingShape = shape;
			this.dragTarget = { kind: 'mid', index: virtualIndex };
			shape.setState(ShapeStateEnum.Resizing);

			const newValue = this.cloneValue(line.value);
			const midPoints = newValue.midPoints ?? [];
			midPoints.splice(virtualIndex, 0, { x: point.x, y: point.y });
			newValue.midPoints = midPoints;
			this.pushLineUpdate(shape, newValue);
			return false;
		}

		return true;
	}

	private handlePointerMove(state: InteractionState, payload: EventPayload): boolean {
		if (this.isDragging) {
			document.body.style.cursor = 'move';
			this.applyDrag(payload);
			return false;
		}

		const shape = state.selectedShapes[0];
		const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
		const point = this.toWorldPoint(payload);
		const threshold = HANDLE_HIT_RADIUS / payload.scale;

		if (
			this.detectTarget(line, point, threshold) ||
			this.detectVirtualHandle(line, point, threshold) !== null
		) {
			document.body.style.cursor = 'move';
			return false;
		}

		return true;
	}

	private handlePointerUp(state: InteractionState): boolean {
		if (!this.isDragging) {
			return true;
		}
		this.finishDrag(state);
		document.body.style.cursor = 'default';
		return false;
	}

	private finishDrag(state: InteractionState) {
		this.actionLogManager.setStreamEnd();
		this.draggingShape?.setState(ShapeStateEnum.Selected);
		if (this.draggingShape) {
			state.selectedShapes[0] = this.draggingShape;
		}
		this.reset();
	}

	private applyDrag(payload: EventPayload) {
		if (!this.draggingShape || !this.dragTarget) {
			return;
		}

		const shape = this.draggingShape;
		const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
		const point = this.toWorldPoint(payload);

		const newValue = this.cloneValue(line.value);
		const target = this.dragTarget;
		if (target.kind === 'start') {
			const snapped = this.trySnapToShape(point, shape.id, newValue.end);
			if (snapped) {
				newValue.start = snapped;
			} else {
				newValue.start = { x: point.x, y: point.y };
			}
		} else if (target.kind === 'end') {
			const snapped = this.trySnapToShape(point, shape.id, newValue.start);
			if (snapped) {
				newValue.end = snapped;
			} else {
				newValue.end = { x: point.x, y: point.y };
			}
		} else if (newValue.midPoints?.[target.index]) {
			newValue.midPoints[target.index] = { x: point.x, y: point.y };
		}

		this.pushLineUpdate(shape, newValue);
	}

	private removeMidPoint(shape: BaseShape, line: LineProperty, index: number) {
		const newValue = this.cloneValue(line.value);
		newValue.midPoints = (newValue.midPoints ?? []).filter((_, i) => i !== index);
		this.pushLineUpdate(shape, newValue);
	}

	private pushLineUpdate(shape: BaseShape, line: LinePropertyValue) {
		const points = [line.start, ...(line.midPoints ?? []), line.end];
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);
		const minX = Math.min(...xs);
		const minY = Math.min(...ys);

		this.actionManager.push(
			new UpdatePropsAction(
				[
					{
						id: shape.id,
						type: shape.type,
						properties: {
							base: {
								x: minX,
								y: minY,
								width: Math.max(...xs) - minX,
								height: Math.max(...ys) - minY,
							},
							line,
						},
					},
				],
				this.ioc,
			),
		);
	}

	/** 命中检测：端点优先于途经点 */
	private detectTarget(line: LineProperty, point: Point, threshold: number): DragTarget | null {
		const v = line.value;

		if (this.isNear(point, v.start, threshold)) {
			return { kind: 'start' };
		}
		if (this.isNear(point, v.end, threshold)) {
			return { kind: 'end' };
		}

		const midPoints = v.midPoints ?? [];
		for (let i = 0; i < midPoints.length; i++) {
			if (this.isNear(point, midPoints[i], threshold)) {
				return { kind: 'mid', index: i };
			}
		}

		return null;
	}

	private detectVirtualHandle(line: LineProperty, point: Point, threshold: number): number | null {
		const handles = line.getVirtualHandles();
		for (let i = 0; i < handles.length; i++) {
			if (this.isNear(point, handles[i], threshold)) {
				return i;
			}
		}
		return null;
	}

	private isNear(a: Point, b: Point, threshold: number): boolean {
		return Math.hypot(a.x - b.x, a.y - b.y) < threshold;
	}

	private toWorldPoint(payload: EventPayload): Point {
		return this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
	}

	private cloneValue(v: LinePropertyValue): LinePropertyValue {
		return {
			...v,
			start: { ...v.start },
			end: { ...v.end },
			midPoints: v.midPoints?.map((p) => ({ ...p })),
		};
	}

	/** 检测世界坐标点是否在某图形内，返回带 shapeId/anchor 的端点；否则返回 null */
	private trySnapToShape(
		point: Point,
		excludeId: string,
		refEndpoint: LineEndpointValue,
	): LineEndpointValue | null {
		const snapShape = this.shapeManager.getShapeByPoint(point);
		if (!snapShape || snapShape.id === excludeId || snapShape.type === ShapeTypeEnum.Line) {
			return null;
		}
		const anchorPt = getShapeAnchorPoint(snapShape, 'auto', refEndpoint);
		return {
			x: anchorPt.x,
			y: anchorPt.y,
			shapeId: snapShape.id,
			anchor: 'auto',
		};
	}

	private reset() {
		this.isDragging = false;
		this.draggingShape = null;
		this.dragTarget = null;
	}
}
