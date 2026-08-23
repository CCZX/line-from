import { BaseProperty } from '@/shape/property/BaseProperty';
import { LineProperty } from '@/shape/property/LineProperty';
import {
	BasePropertyValue,
	LinePropertyValue,
	ShapeData,
	ShapePropertyEnum,
	ShapeStateEnum,
} from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IocContainerService } from '@/common/contract';
import { IMatrixService } from '@/common/contract/MatrixService';

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

	@inject(IMatrixService)
	private matrixService!: IMatrixService;

	private isResizing = false;
	private direction: Dir | null = null;
	private startLocalPoint: Point | null = null;
	private originAABB: Rectangle | null = null;
	private originShapeProps: Map<string, BasePropertyValue> = new Map();
	private originLineProps: Map<string, LinePropertyValue> = new Map();

	public enable(_state: InteractionState): boolean {
		return this.selectService.getSelectedShapes().length >= 2;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointermove':
				if (e.buttons !== 1 && this.isResizing) {
					this.selectService
						.getSelectedShapes()
						.forEach((s) => s.setState(ShapeStateEnum.MultiSelected));
					this.reset();
				}
				return this.handlePointerMove(payload);
			case 'pointerdown':
				return this.handlePointerDown(payload);
			case 'pointerup':
				return this.handlePointerUp();
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

	private handlePointerMove(payload: EventPayload): boolean {
		if (this.isResizing) {
			document.body.style.cursor = CURSOR_MAP[this.direction!];
			this.applyResize(payload);
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

	private handlePointerDown(payload: EventPayload): boolean {
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

		const selectedShapes = this.selectService.getSelectedShapes();
		this.originShapeProps.clear();
		this.originLineProps.clear();
		for (const shape of selectedShapes) {
			const p = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
			if (p) {
				this.originShapeProps.set(shape.id, { ...p });
			}
			if (shape.hasProperty(ShapePropertyEnum.Line)) {
				const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line)?.get();
				if (line) {
					this.originLineProps.set(shape.id, {
						...line,
						start: { ...line.start },
						end: { ...line.end },
						midPoints: line.midPoints?.map((point) => ({ ...point })),
					});
				}
			}
		}

		this.isResizing = true;
		selectedShapes.forEach((s) => s.setState(ShapeStateEnum.Resizing));

		return false;
	}

	private handlePointerUp(): boolean {
		if (!this.isResizing) {
			return true;
		}

		this.actionLogManager.setStreamEnd();

		this.selectService.getSelectedShapes().forEach((s) => s.setState(ShapeStateEnum.MultiSelected));
		this.reset();
		document.body.style.cursor = 'default';
		return false;
	}

	private applyResize(payload: EventPayload) {
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
		const resizeMatrix = this.matrixService.createRectMappingMatrix(this.originAABB, newAABB);

		const selectedShapes = this.selectService.getSelectedShapes();
		const shapeDatas: ShapeData[] = [];
		for (const shape of selectedShapes) {
			const origin = this.originShapeProps.get(shape.id);
			if (!origin) {
				continue;
			}

			const originCenter = {
				x: origin.x + origin.width / 2,
				y: origin.y + origin.height / 2,
			};
			const nextCenter = this.matrixService.transformPoint(resizeMatrix, originCenter);
			const width = Math.max(MIN_SIZE, origin.width * scaleX);
			const height = Math.max(MIN_SIZE, origin.height * scaleY);
			const properties: ShapeData['properties'] = {
				base: {
					...origin,
					x: nextCenter.x - width / 2,
					y: nextCenter.y - height / 2,
					width,
					height,
				},
			};

			const originLine = this.originLineProps.get(shape.id);
			if (originLine) {
				const start = this.matrixService.transformPoint(resizeMatrix, originLine.start);
				const end = this.matrixService.transformPoint(resizeMatrix, originLine.end);
				properties.line = {
					...originLine,
					start: { ...originLine.start, ...start },
					end: { ...originLine.end, ...end },
					midPoints: originLine.midPoints?.map((point) =>
						this.matrixService.transformPoint(resizeMatrix, point),
					),
				};
			}

			shapeDatas.push({
				id: shape.id,
				type: shape.type,
				properties,
			});
		}
		this.actionManager.push(new UpdatePropsAction(shapeDatas, this.ioc));

		this.selectService.updateMultiSelectOverlay(selectedShapes);
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
		this.originLineProps.clear();
	}
}
