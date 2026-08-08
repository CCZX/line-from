import { Graphics } from 'pixi.js';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IHandler, IHandlerWithInteraction, IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { isRectIntersect } from '@/shape/geometry';
import { ShapeStateEnum } from '@/shape/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { DECORATE_COLORS } from '@/common/color';

const DRAG_THRESHOLD = 3;

@provide(IHandlerWithInteraction)
export class MarqueeHandler implements IHandler {
	public type: HandlerEnum = HandlerEnum.Marquee;
	public sort = 60;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	private isDragging = false;
	private startClientX = 0;
	private startClientY = 0;
	private hasStart = false;
	private marquee: Graphics | null = null;
	private lastViewportX = 0;
	private lastViewportY = 0;

	public enable(_state: InteractionState): boolean {
		return true;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointerdown':
				return this.handlePointerDown(payload);
			case 'pointermove':
				if (e.buttons !== 1) {
					if (this.isDragging || this.hasStart) {
						this.removeMarquee();
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

	private handlePointerDown(payload: EventPayload): boolean {
		const startLocal = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const shapeUnderCursor = this.shapeManager.getShapeByPoint(startLocal);

		if (shapeUnderCursor) {
			return true;
		}

		this.startClientX = startLocal.x;
		this.startClientY = startLocal.y;
		this.hasStart = true;
		return true;
	}

	private handlePointerMove(state: InteractionState, payload: EventPayload): boolean {
		if (!this.hasStart) {
			return true;
		}

		const curLocal = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);

		const dx = curLocal.x - this.startClientX;
		const dy = curLocal.y - this.startClientY;

		if (!this.isDragging) {
			if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
				return true;
			}
			this.isDragging = true;
		}

		this.lastViewportX = curLocal.x;
		this.lastViewportY = curLocal.y;
		this.updateMarquee();
		this.selectShapesInMarquee(state);
		return false;
	}

	private handlePointerUp(state: InteractionState): boolean {
		if (this.isDragging) {
			this.removeMarquee();
			this.reset();
			return false;
		}

		this.reset();
		return true;
	}

	private updateMarquee() {
		const x = Math.min(this.startClientX, this.lastViewportX);
		const y = Math.min(this.startClientY, this.lastViewportY);
		const w = Math.abs(this.lastViewportX - this.startClientX);
		const h = Math.abs(this.lastViewportY - this.startClientY);

		if (!this.marquee) {
			this.marquee = new Graphics();
			this.selectService.addMarqueeGraphics(this.marquee);
		}

		this.marquee.clear();
		this.marquee.lineStyle(1, DECORATE_COLORS.selection, 1);
		this.marquee.beginFill(DECORATE_COLORS.selection, 0.1);
		this.marquee.drawRect(x, y, w, h);
		this.marquee.endFill();
	}

	private selectShapesInMarquee(state: InteractionState) {
		const marqueeRect = {
			x: Math.min(this.startClientX, this.lastViewportX),
			y: Math.min(this.startClientY, this.lastViewportY),
			width: Math.abs(this.lastViewportX - this.startClientX),
			height: Math.abs(this.lastViewportY - this.startClientY),
		};

		const allShapes = this.shapeManager.getAllShapes();
		const intersectingShapes = allShapes.filter((shape) => {
			const bounds = shape.getBounds();
			const shapeRect = {
				x: shape.container.x - bounds.width / 2,
				y: shape.container.y - bounds.height / 2,
				width: bounds.width,
				height: bounds.height,
			};
			return isRectIntersect(marqueeRect, shapeRect);
		});

		this.selectService.setMultipleSelectedShapes(intersectingShapes);

		state.selectedShapes = intersectingShapes;

		const targetState =
			intersectingShapes.length > 1 ? ShapeStateEnum.MultiSelected : ShapeStateEnum.Selected;

		intersectingShapes.forEach((shape) => {
			shape.setState(targetState);
		});

		allShapes
			.filter((shape) => !intersectingShapes.includes(shape))
			.forEach((shape) => {
				const s = shape.getState();
				if (s === ShapeStateEnum.Selected || s === ShapeStateEnum.MultiSelected) {
					shape.setState(ShapeStateEnum.Normal);
				}
			});

		this.selectService.updateMultiSelectOverlay(intersectingShapes);
	}

	private removeMarquee() {
		if (this.marquee) {
			this.marquee.removeFromParent();
			this.marquee.destroy();
			this.marquee = null;
		}
	}

	private reset() {
		this.isDragging = false;
		this.hasStart = false;
		this.startClientX = 0;
		this.startClientY = 0;
		this.lastViewportX = 0;
		this.lastViewportY = 0;
	}
}
