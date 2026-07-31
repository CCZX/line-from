import { ShapeStateEnum } from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IHandler, IHandlerWithInteraction, IShapeManager } from '@/domain/contract';
import { IViewportService } from '@/domain/contract/ViewportService';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IHandlerWithInteraction)
export class HoverHandler implements IHandler {
	public type: HandlerEnum = HandlerEnum.Hover;
	public sort: number = 90;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	public enable(_state: InteractionState): boolean {
		return true;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		if (e.type !== 'pointermove') {
			return true;
		}

		const worldPoint = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const nextShape = this.shapeManager.getShapeByPoint(worldPoint);

		document.body.style.cursor = 'default';

		if (nextShape?.id === state.hoveredShape?.id) {
			return true;
		}

		if (state.hoveredShape?.getState() === ShapeStateEnum.Hover) {
			state.hoveredShape.setState(ShapeStateEnum.Normal);
		}

		const isSelected = nextShape && state.selectedShapes.some((s) => s.id === nextShape.id);
		if (nextShape?.getState() === ShapeStateEnum.Normal && !isSelected) {
			nextShape.setState(ShapeStateEnum.Hover);
		}

		state.hoveredShape = nextShape || null;

		return true;
	}
}
