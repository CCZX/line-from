import { ShapeStateEnum } from '@/shape/contract';
import { Point as PixiPoint } from '@pixi/core';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import {
	IHandlerWithInteraction,
	IHandler,
	ISelectService,
	IShapeManager,
	ITextSelectionService,
} from '@/domain/contract';
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
	// 编辑态的选区交互必须先于 Select/Move，否则点击文字会被当成移动图形。
	public sort = 30;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(ITextSelectionService)
	private selectionService!: ITextSelectionService;

	private lastPointerDown: PointerDownSnapshot | null = null;

	public enable(_state: InteractionState): boolean {
		return true;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		const selectedShapes = this.selectService.getSelectedShapes();
		const editingShape = selectedShapes.find(
			(shape): shape is TextEditableShape =>
				shape instanceof TextEditableShape && shape.getState() === ShapeStateEnum.Edit,
		);

		if (editingShape && this.selectionService.isActive(editingShape)) {
			return this.executeSelection(e, payload, editingShape);
		}

		if (e.type !== 'pointerdown') {
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

		// 第一次 pointerdown 发生时图形可能尚未被 SelectHandler 选中，但仍需保留快照，
		// 这样第二次 pointerdown 才能识别为对未选中图形的直接双击。
		if (selectedShapes.length !== 1 || selectedShapes[0].id !== shapeUnderCursor.id) {
			return true;
		}

		// 单击只负责选中；同一图形上的连续两次点击进入文字编辑
		if (!isSequentialDoubleClick && !isNativeDoubleClick) {
			return true;
		}

		if (shapeUnderCursor.getState() === ShapeStateEnum.Edit) {
			return false;
		}

		shapeUnderCursor.setState(ShapeStateEnum.Edit);
		const localPoint = this.toShapeLocal(shapeUnderCursor, worldPoint);
		this.selectionService.pointerDown(shapeUnderCursor, localPoint, { selectWord: true });
		e.preventDefault();

		return false;
	}

	private executeSelection(
		e: PointerEvent,
		payload: EventPayload,
		shape: TextEditableShape,
	): boolean {
		const worldPoint = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const localPoint = this.toShapeLocal(shape, worldPoint);

		if (e.type === 'pointerdown') {
			const shapeUnderCursor = this.shapeManager.getShapeByPoint(worldPoint);
			if (shapeUnderCursor !== shape) {
				return true;
			}

			e.preventDefault();
			this.selectionService.pointerDown(shape, localPoint, {
				extend: e.shiftKey,
				selectWord: e.detail === 2,
				selectLine: e.detail >= 3,
			});
			return false;
		}

		if (e.type === 'pointermove') {
			if (e.buttons !== 1) {
				this.selectionService.pointerUp();
				return true;
			}
			return this.selectionService.pointerMove(shape, localPoint) ? false : true;
		}

		if (e.type === 'pointerup' || e.type === 'pointercancel') {
			return this.selectionService.pointerUp() ? false : true;
		}

		return true;
	}

	private toShapeLocal(shape: TextEditableShape, worldPoint: PixiPoint): Point {
		const viewport = this.viewportService.getStage().getViewport();
		const local = shape.container.toLocal(worldPoint, viewport);
		return { x: local.x, y: local.y };
	}
}
