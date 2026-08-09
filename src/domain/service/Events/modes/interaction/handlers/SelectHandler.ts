import { BaseShape } from '@/shape/BaseShape';
import { ShapeStateEnum } from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { isPointInRect } from '@/shape/geometry';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IHandlerWithInteraction)
export class SelectHandler implements IHandler {
	public type: HandlerEnum = HandlerEnum.Select;
	// Select 必须在 Move 之前执行，这样 pointerdown 选中图形后，同一次按下的拖拽能被 MoveHandler 接管
	public sort = 35;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	public enable(_state: InteractionState): boolean {
		return true;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		if (e.type !== 'pointerdown') {
			return true;
		}

		const worldPoint = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const nextShape = this.shapeManager.getShapeByPoint(worldPoint);
		const selectedShapes = this.selectService.getSelectedShapes();

		// 点击已选中的图形，放行给 MoveHandler
		if (nextShape && selectedShapes.some((s) => s.id === nextShape.id)) {
			return true;
		}

		// 点击在多选 overlay 上，放行给 MoveHandler
		if (this.isOnOverlay(payload)) {
			return true;
		}

		if (state.hoveredShape?.getState() === ShapeStateEnum.Hover) {
			state.hoveredShape.setState(ShapeStateEnum.Normal);
		}

		// 取消所有选中
		selectedShapes.forEach((s) => s.setState(ShapeStateEnum.Normal));
		this.selectService.clearSelectedShapes();

		if (nextShape) {
			nextShape.setState(ShapeStateEnum.Selected);
			this.selectService.setSelectedShape(nextShape);
		}

		this.selectService.updateMultiSelectOverlay(this.selectService.getSelectedShapes());

		return true;
	}

	private isOnOverlay(payload: EventPayload): boolean {
		const rect = this.selectService.getMultiSelectOverlayRect();
		if (!rect) {
			return false;
		}
		const local = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const expanded = {
			x: rect.x - 4,
			y: rect.y - 4,
			width: rect.width + 8,
			height: rect.height + 8,
		};
		return isPointInRect({ x: local.x, y: local.y }, expanded);
	}
}
