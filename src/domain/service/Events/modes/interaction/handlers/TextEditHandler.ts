import { ShapeStateEnum } from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IHandlerWithInteraction, IHandler, IShapeManager } from '@/domain/contract';
import { IViewportService } from '@/domain/contract/ViewportService';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { TextEditableShape } from '@/shape/TextEditableShape';

const DOUBLE_CLICK_INTERVAL = 450;
const DOUBLE_CLICK_DISTANCE = 8;

interface PointerDownSnapshot {
	shapeId: string;
	at: number;
	x: number;
	y: number;
}

@provide(IHandlerWithInteraction)
export class TextEditHandler implements IHandler {
	public type: HandlerEnum = HandlerEnum.TextEdit;
	public sort = 70;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	private lastPointerDown: PointerDownSnapshot | null = null;

	public enable(_state: InteractionState): boolean {
		return true;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		if (e.type !== 'pointerdown') {
			return true;
		}

		if (state.selectedShapes.length !== 1) {
			this.lastPointerDown = null;
			return true;
		}

		const worldPoint = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const shapeUnderCursor = this.shapeManager.getShapeByPoint(worldPoint);
		if (!(shapeUnderCursor instanceof TextEditableShape)) {
			this.lastPointerDown = null;
			return true;
		}

		if (state.selectedShapes[0].id !== shapeUnderCursor.id) {
			this.lastPointerDown = null;
			return true;
		}

		const current: PointerDownSnapshot = {
			shapeId: shapeUnderCursor.id,
			at: Date.now(),
			x: e.clientX,
			y: e.clientY,
		};
		const previous = this.lastPointerDown;
		const distance = previous
			? Math.hypot(current.x - previous.x, current.y - previous.y)
			: Number.POSITIVE_INFINITY;
		const isSequentialDoubleClick =
			previous?.shapeId === current.shapeId &&
			current.at - previous.at <= DOUBLE_CLICK_INTERVAL &&
			distance <= DOUBLE_CLICK_DISTANCE;
		const isNativeDoubleClick = e.detail === 2;

		this.lastPointerDown = isSequentialDoubleClick || isNativeDoubleClick ? null : current;

		// 单击只负责选中；同一图形上的连续两次点击进入文字编辑
		if (!isSequentialDoubleClick && !isNativeDoubleClick) {
			return true;
		}

		if (shapeUnderCursor.getState() === ShapeStateEnum.Edit) {
			return false;
		}

		shapeUnderCursor.setState(ShapeStateEnum.Edit);
		state.selectedShapes = [shapeUnderCursor];

		return false;
	}
}
