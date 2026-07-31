import { BaseProperty } from '@/shape/property/BaseProperty';
import { BasePropertyValue, ShapeData, ShapePropertyEnum, ShapeStateEnum } from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { UpdatePropsAction } from '@/domain/service/action/Actions/UpdatePropsAction';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IocContainerService } from '@/common/contract';

const MIN_SIZE = 10;
const HANDLE_HIT_RADIUS = 10;
const OVERLAY_OFFSET = 4;

enum Dir {
	TL = 'TL',
	TR = 'TR',
	BR = 'BR',
	BL = 'BL',
}

const CURSOR_MAP: Record<Dir, string> = {
	[Dir.TL]: 'nwse-resize',
	[Dir.TR]: 'nesw-resize',
	[Dir.BR]: 'nwse-resize',
	[Dir.BL]: 'nesw-resize',
};

@provide(IHandlerWithInteraction)
export class MultiResizeHandler implements IHandler {
	public type = HandlerEnum.Resize;
	public sort = 80;

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

	private isResizing = false;
	private direction: Dir | null = null;
	private startLocalPoint: Point | null = null;
	private originAABB: Rectangle | null = null;
	private originShapeProps: Map<string, BasePropertyValue> = new Map();

	public enable(state: InteractionState): boolean {
		return state.selectedShapes.length >= 2;
	}

	public execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointermove':
				if (e.buttons !== 1 && this.isResizing) {
					state.selectedShapes.forEach((s) => s.setState(ShapeStateEnum.MultiSelected));
					this.reset();
				}
				return this.handlePointerMove(state, payload);
			case 'pointerdown':
				return this.handlePointerDown(state, payload);
			case 'pointerup':
				return this.handlePointerUp(state);
			default:
				return true;
		}
	}

	private getLocalPoint(payload: EventPayload): Point {
		const p = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		return { x: p.x, y: p.y };
	}

	private getExpandedOverlayRect(): Rectangle | null {
		const rect = this.selectService.getMultiSelectOverlayRect();
		if (!rect) {
			return null;
		}
		return {
			x: rect.x - OVERLAY_OFFSET,
			y: rect.y - OVERLAY_OFFSET,
			width: rect.width + OVERLAY_OFFSET * 2,
			height: rect.height + OVERLAY_OFFSET * 2,
		};
	}

	private handlePointerMove(state: InteractionState, payload: EventPayload): boolean {
		if (this.isResizing) {
			document.body.style.cursor = CURSOR_MAP[this.direction!];
			this.applyResize(state, payload);
			return false;
		}

		const overlayRect = this.getExpandedOverlayRect();
		if (!overlayRect) {
			return true;
		}

		const local = this.getLocalPoint(payload);
		const handle = this.detectHandle(local, overlayRect, payload.scale);

		if (handle) {
			document.body.style.cursor = CURSOR_MAP[handle];
			return false;
		}

		return true;
	}

	private handlePointerDown(state: InteractionState, payload: EventPayload): boolean {
		const overlayRect = this.getExpandedOverlayRect();
		if (!overlayRect) {
			return true;
		}

		const local = this.getLocalPoint(payload);
		const handle = this.detectHandle(local, overlayRect, payload.scale);

		if (!handle) {
			return true;
		}

		this.actionLogManager.setStreamStart();

		this.direction = handle;
		this.startLocalPoint = local;
		this.originAABB = { ...this.selectService.getMultiSelectOverlayRect()! };

		this.originShapeProps.clear();
		for (const shape of state.selectedShapes) {
			const p = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
			if (p) {
				this.originShapeProps.set(shape.id, { ...p });
			}
		}

		this.isResizing = true;
		state.selectedShapes.forEach((s) => s.setState(ShapeStateEnum.Resizing));

		return false;
	}

	private handlePointerUp(state: InteractionState): boolean {
		if (!this.isResizing) {
			return true;
		}

		this.actionLogManager.setStreamEnd();

		state.selectedShapes.forEach((s) => s.setState(ShapeStateEnum.MultiSelected));
		this.reset();
		document.body.style.cursor = 'default';
		return false;
	}

	private applyResize(state: InteractionState, payload: EventPayload) {
		if (!this.originAABB || !this.direction) {
			return;
		}

		const local = this.getLocalPoint(payload);
		const newAABB = this.computeNewAABB(local);

		const ow = this.originAABB.width;
		const oh = this.originAABB.height;
		if (ow === 0 || oh === 0) {
			return;
		}

		const scaleX = newAABB.width / ow;
		const scaleY = newAABB.height / oh;

		const shapeDatas: ShapeData[] = [];
		for (const shape of state.selectedShapes) {
			const origin = this.originShapeProps.get(shape.id);
			if (!origin) {
				continue;
			}

			const relX = (origin.x - this.originAABB.x) / ow;
			const relY = (origin.y - this.originAABB.y) / oh;

			shapeDatas.push({
				id: shape.id,
				type: shape.type,
				properties: {
					base: {
						x: newAABB.x + relX * newAABB.width,
						y: newAABB.y + relY * newAABB.height,
						width: Math.max(MIN_SIZE, origin.width * scaleX),
						height: Math.max(MIN_SIZE, origin.height * scaleY),
					},
				},
			});
		}
		this.actionManager.push(new UpdatePropsAction(shapeDatas, this.ioc));

		this.selectService.updateMultiSelectOverlay(state.selectedShapes);
	}

	private computeNewAABB(local: Point): Rectangle {
		const orig = this.originAABB!;
		const dir = this.direction!;
		const dx = local.x - this.startLocalPoint!.x;
		const dy = local.y - this.startLocalPoint!.y;

		let x = orig.x,
			y = orig.y,
			w = orig.width,
			h = orig.height;

		switch (dir) {
			case Dir.BR:
				w = Math.max(MIN_SIZE, orig.width + dx);
				h = Math.max(MIN_SIZE, orig.height + dy);
				break;
			case Dir.TL:
				w = Math.max(MIN_SIZE, orig.width - dx);
				h = Math.max(MIN_SIZE, orig.height - dy);
				x = orig.x + orig.width - w;
				y = orig.y + orig.height - h;
				break;
			case Dir.TR:
				w = Math.max(MIN_SIZE, orig.width + dx);
				h = Math.max(MIN_SIZE, orig.height - dy);
				y = orig.y + orig.height - h;
				break;
			case Dir.BL:
				w = Math.max(MIN_SIZE, orig.width - dx);
				h = Math.max(MIN_SIZE, orig.height + dy);
				x = orig.x + orig.width - w;
				break;
		}

		return { x, y, width: w, height: h };
	}

	private detectHandle(local: Point, overlayRect: Rectangle, scale: number): Dir | null {
		const threshold = HANDLE_HIT_RADIUS / scale;
		const corners = [
			{ px: overlayRect.x, py: overlayRect.y, dir: Dir.TL },
			{ px: overlayRect.x + overlayRect.width, py: overlayRect.y, dir: Dir.TR },
			{
				px: overlayRect.x + overlayRect.width,
				py: overlayRect.y + overlayRect.height,
				dir: Dir.BR,
			},
			{ px: overlayRect.x, py: overlayRect.y + overlayRect.height, dir: Dir.BL },
		];

		for (const c of corners) {
			if (Math.abs(local.x - c.px) < threshold && Math.abs(local.y - c.py) < threshold) {
				return c.dir;
			}
		}

		return null;
	}

	private reset() {
		this.isResizing = false;
		this.direction = null;
		this.startLocalPoint = null;
		this.originAABB = null;
		this.originShapeProps.clear();
	}
}
