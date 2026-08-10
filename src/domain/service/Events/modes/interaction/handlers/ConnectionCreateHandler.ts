import { Point as PixiPoint } from '@pixi/core';
import { IocContainerService } from '@/common/contract';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import {
	EventPayload,
	HandlerEnum,
	IHandler,
	InteractionState,
} from '@/domain/contract/EventManager';
import { IShapeManager } from '@/domain/contract/ShapeManager';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { CreateShapeAction } from '@/domain/service/Action/Actions/CreateShapeAction';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { BaseShape } from '@/shape/BaseShape';
import {
	LineEndpointValue,
	LinePropertyValue,
	ShapeData,
	ShapeDecorateTypeEnum,
	ShapeTypeEnum,
} from '@/shape/contract';
import { ConnectionAnchor, SelectedBorder } from '@/shape/decorate/SelectedBorder';
import { getShapeAnchorPoint } from '@/shape/geometry';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IHandlerWithInteraction } from '@/domain/contract';
import { SHAPE_COLORS } from '@/common/color';

const HANDLE_HIT_RADIUS = 9;
const DRAG_THRESHOLD = 3;

let connectionIdCounter = 0;

function nextConnectionId(): string {
	return `shape-connection-${++connectionIdCounter}-${Date.now()}`;
}

/**
 * 从普通图形选中框的四向锚点拖拽创建连线。
 *
 * pointerdown 仅记录起点，移动超过阈值后才真正创建，避免单击锚点产生零长度连线。
 * 新线起点绑定到明确方向，终点拖到其他图形上时复用现有的自动吸附能力。
 */
@provide(IHandlerWithInteraction)
export class ConnectionCreateHandler implements IHandler {
	public type = HandlerEnum.ConnectionCreate;
	public sort = 15;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(ISelectService)
	private selectService!: ISelectService;

	private sourceShape: BaseShape | null = null;
	private sourceAnchor: ConnectionAnchor | null = null;
	private startPoint: Point | null = null;
	private creatingData: ShapeData | null = null;
	private isStreaming = false;

	public enable(_state: InteractionState): boolean {
		const selectedShapes = this.selectService.getSelectedShapes();
		return selectedShapes.length === 1 && selectedShapes[0].type !== ShapeTypeEnum.Line;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		const selectedShape = this.selectService.getSelectedShapes()[0];
		switch (e.type) {
			case 'pointerdown':
				return this.handlePointerDown(selectedShape, payload);
			case 'pointermove':
				if (this.sourceShape && e.buttons !== 1) {
					this.finish();
					return false;
				}
				return this.handlePointerMove(selectedShape, payload);
			case 'pointerup':
				return this.handlePointerUp(payload);
			default:
				return true;
		}
	}

	private handlePointerDown(shape: BaseShape, payload: EventPayload): boolean {
		const anchor = this.detectHandle(shape, payload);
		if (!anchor) {
			return true;
		}

		this.sourceShape = shape;
		this.sourceAnchor = anchor;
		this.startPoint = getShapeAnchorPoint(shape, anchor);
		document.body.style.cursor = 'crosshair';
		return false;
	}

	private handlePointerMove(selectedShape: BaseShape, payload: EventPayload): boolean {
		const shape = this.sourceShape;
		const anchor = this.sourceAnchor;
		const start = this.startPoint;

		if (!shape || !anchor || !start) {
			const hoveredAnchor = this.detectHandle(selectedShape, payload);
			if (hoveredAnchor) {
				document.body.style.cursor = 'crosshair';
				return false;
			}
			return true;
		}

		const current = this.toWorldPoint(payload);
		if (!this.creatingData && this.distance(start, current) < DRAG_THRESHOLD / payload.scale) {
			return false;
		}

		const startEndpoint: LineEndpointValue = {
			x: start.x,
			y: start.y,
			shapeId: shape.id,
			anchor,
		};
		const endEndpoint = this.trySnapEndpoint(current, shape.id, startEndpoint);

		if (!this.creatingData) {
			this.createLine(startEndpoint, endEndpoint);
		} else {
			this.updateLine(endEndpoint);
		}

		document.body.style.cursor = 'crosshair';
		return false;
	}

	private handlePointerUp(payload: EventPayload): boolean {
		if (!this.sourceShape || !this.sourceAnchor || !this.startPoint) {
			return true;
		}

		// pointerup 位置可能晚于最后一次 pointermove，补一次最终端点更新。
		const current = this.toWorldPoint(payload);
		if (
			this.creatingData ||
			this.distance(this.startPoint, current) >= DRAG_THRESHOLD / payload.scale
		) {
			const startEndpoint: LineEndpointValue = {
				x: this.startPoint.x,
				y: this.startPoint.y,
				shapeId: this.sourceShape.id,
				anchor: this.sourceAnchor,
			};
			const endEndpoint = this.trySnapEndpoint(current, this.sourceShape.id, startEndpoint);
			if (!this.creatingData) {
				this.createLine(startEndpoint, endEndpoint);
			} else {
				this.updateLine(endEndpoint);
			}
		}

		this.finish();
		return false;
	}

	private createLine(start: LineEndpointValue, end: LineEndpointValue) {
		const data: ShapeData = {
			id: nextConnectionId(),
			type: ShapeTypeEnum.Line,
			properties: {
				base: this.getLineBounds(start, end),
				stroke: {
					color: SHAPE_COLORS.border.default,
					width: 1,
					alpha: 1,
					style: 'sketchy',
				},
				line: {
					start,
					end,
					routing: 'straight',
					endArrow: true,
				},
			},
		};

		this.creatingData = data;
		this.actionLogManager.setStreamStart();
		this.isStreaming = true;
		this.actionManager.push(new CreateShapeAction([data], this.ioc));
	}

	private updateLine(end: LineEndpointValue) {
		if (!this.creatingData) {
			return;
		}

		const line = this.creatingData.properties.line!;
		const nextLine: LinePropertyValue = { ...line, end };

		// CreateShapeAction 的数据与撤销动作共享；同步最终值可确保撤销后重做恢复完整连线。
		this.creatingData.properties.line = nextLine;
		const base = this.getLineBounds(nextLine.start, nextLine.end);
		this.creatingData.properties.base = base;

		this.actionManager.push(
			new UpdatePropsAction(
				[
					{
						id: this.creatingData.id,
						type: ShapeTypeEnum.Line,
						properties: { base, line: nextLine },
					},
				],
				this.ioc,
			),
		);
	}

	private detectHandle(shape: BaseShape, payload: EventPayload): ConnectionAnchor | null {
		const border = shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder);
		if (!(border instanceof SelectedBorder)) {
			return null;
		}

		const viewport = this.viewportService.getStage().getViewport();
		const point = this.toWorldPoint(payload);
		const local = shape.container.toLocal(new PixiPoint(point.x, point.y), viewport);
		const threshold = HANDLE_HIT_RADIUS / payload.scale;

		for (const [anchor, center] of Object.entries(border.getConnectionHandleCenters())) {
			if (this.distance(local, center) <= threshold) {
				return anchor as ConnectionAnchor;
			}
		}
		return null;
	}

	private trySnapEndpoint(
		point: Point,
		sourceId: string,
		refEndpoint: LineEndpointValue,
	): LineEndpointValue {
		const target = this.shapeManager.getShapeByPoint(point);
		if (!target || target.id === sourceId || target.type === ShapeTypeEnum.Line) {
			return { x: point.x, y: point.y };
		}

		const anchorPoint = getShapeAnchorPoint(target, 'auto', refEndpoint);
		return {
			x: anchorPoint.x,
			y: anchorPoint.y,
			shapeId: target.id,
			anchor: 'auto',
		};
	}

	private getLineBounds(start: Point, end: Point) {
		const x = Math.min(start.x, end.x);
		const y = Math.min(start.y, end.y);
		return {
			x,
			y,
			width: Math.abs(end.x - start.x),
			height: Math.abs(end.y - start.y),
		};
	}

	private toWorldPoint(payload: EventPayload): Point {
		return this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
	}

	private distance(a: Point, b: Point): number {
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	private finish() {
		if (this.isStreaming) {
			this.actionLogManager.setStreamEnd();
			this.isStreaming = false;
		}
		this.sourceShape = null;
		this.sourceAnchor = null;
		this.startPoint = null;
		this.creatingData = null;
		document.body.style.cursor = 'default';
	}
}
