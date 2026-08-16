import { Point as PixiPoint } from '@pixi/core';
import { BaseShape } from '@/shape/BaseShape';
import { BaseProperty } from '@/shape/property/BaseProperty';
import {
	BasePropertyValue,
	ResizeDirection,
	ShapeDecorateTypeEnum,
	ShapePropertyEnum,
	ShapeStateEnum,
} from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IocContainerService } from '@/common/contract';
import { SelectedBorder } from '@/shape/decorate/SelectedBorder';

const MIN_SIZE = 10;
const HANDLE_HIT_RADIUS = 8;

const CURSOR_MAP: Record<ResizeDirection, string> = {
	[ResizeDirection.TL]: 'nwse-resize',
	[ResizeDirection.TR]: 'nesw-resize',
	[ResizeDirection.BR]: 'nwse-resize',
	[ResizeDirection.BL]: 'nesw-resize',
	[ResizeDirection.T]: 'ns-resize',
	[ResizeDirection.B]: 'ns-resize',
	[ResizeDirection.L]: 'ew-resize',
	[ResizeDirection.R]: 'ew-resize',
};

@provide(IHandlerWithInteraction)
export class ResizeHandler implements IHandler {
	public type = HandlerEnum.Resize;
	public sort = 20;

	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	@inject(ISelectService)
	private selectService!: ISelectService;

	private isResizing = false;
	private resizingShape: BaseShape | null = null;
	private direction: ResizeDirection | null = null;
	private startViewportPoint: Point | null = null;
	private originBaseProps: BasePropertyValue | null = null;

	public enable(_state: InteractionState): boolean {
		const selectedShapes = this.selectService.getSelectedShapes();
		// 线由 LineEditHandler 负责端点/途经点编辑，不走 bbox resize
		return selectedShapes.length === 1 && selectedShapes[0].supportsBoxResize;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointermove':
				// 没有按住主按键时不在 resize 中，清除残留状态
				if (e.buttons !== 1 && this.isResizing) {
					this.resizingShape?.setState(ShapeStateEnum.Selected);
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

	private handlePointerMove(payload: EventPayload): boolean {
		// 正在 resize 中，更新尺寸
		if (this.isResizing) {
			document.body.style.cursor = CURSOR_MAP[this.direction!];
			this.applyResize(payload.viewportPoint);
			return false;
		}

		// 悬停在 resize handle 上，改光标并打断后续 handler
		const shape = this.selectService.getSelectedShapes()[0];
		const handle = this.detectHandle(shape, payload.viewportPoint, payload.scale);
		if (handle) {
			document.body.style.cursor = CURSOR_MAP[handle];
			return false;
		}

		return true;
	}

	private handlePointerDown(payload: EventPayload): boolean {
		const shape = this.selectService.getSelectedShapes()[0];
		const handle = this.detectHandle(shape, payload.viewportPoint, payload.scale);
		if (!handle) {
			return true;
		}

		this.actionLogManager.setStreamStart();

		this.direction = handle;
		this.startViewportPoint = payload.viewportPoint;

		const p = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
		this.originBaseProps = { ...p };

		this.isResizing = true;
		this.resizingShape = shape;

		this.resizingShape.setState(ShapeStateEnum.Resizing);

		return false;
	}

	private handlePointerUp(): boolean {
		if (!this.isResizing) {
			return true;
		}

		this.actionLogManager.setStreamEnd();

		this.resizingShape?.setState(ShapeStateEnum.Selected);
		this.reset();
		document.body.style.cursor = 'default';
		return false;
	}

	private applyResize(viewportPoint: Point) {
		if (!this.resizingShape || !this.originBaseProps || !this.direction) {
			return;
		}

		// 转换到容器本地坐标，适配旋转后的 resize
		const start = this.startViewportPoint!;
		const localPoint = this.resizingShape.container.toLocal(
			new PixiPoint(viewportPoint.x, viewportPoint.y),
		);
		const localStart = this.resizingShape.container.toLocal(new PixiPoint(start.x, start.y));
		const dx = localPoint.x - localStart.x;
		const dy = localPoint.y - localStart.y;

		const { x, y, width, height } = this.originBaseProps;
		let newX = x;
		let newY = y;
		let newWidth = width;
		let newHeight = height;

		switch (this.direction) {
			case ResizeDirection.BR:
				newWidth = Math.max(MIN_SIZE, width + dx);
				newHeight = Math.max(MIN_SIZE, height + dy);
				break;
			case ResizeDirection.TL:
				newWidth = Math.max(MIN_SIZE, width - dx);
				newHeight = Math.max(MIN_SIZE, height - dy);
				newX = x + (width - newWidth);
				newY = y + (height - newHeight);
				break;
			case ResizeDirection.TR:
				newWidth = Math.max(MIN_SIZE, width + dx);
				newHeight = Math.max(MIN_SIZE, height - dy);
				newY = y + (height - newHeight);
				break;
			case ResizeDirection.BL:
				newWidth = Math.max(MIN_SIZE, width - dx);
				newHeight = Math.max(MIN_SIZE, height + dy);
				newX = x + (width - newWidth);
				break;
			case ResizeDirection.T:
				newHeight = Math.max(MIN_SIZE, height - dy);
				newY = y + (height - newHeight);
				break;
			case ResizeDirection.B:
				newHeight = Math.max(MIN_SIZE, height + dy);
				break;
			case ResizeDirection.L:
				newWidth = Math.max(MIN_SIZE, width - dx);
				newX = x + (width - newWidth);
				break;
			case ResizeDirection.R:
				newWidth = Math.max(MIN_SIZE, width + dx);
				break;
		}

		const nextBase = this.resizingShape.resolveResize({
			origin: this.originBaseProps,
			proposed: { x: newX, y: newY, width: newWidth, height: newHeight },
			direction: this.direction,
			deltaX: dx,
			deltaY: dy,
			minSize: MIN_SIZE,
		});

		this.actionManager.push(
			new UpdatePropsAction(
				[
					{
						id: this.resizingShape.id,
						type: this.resizingShape.type,
						properties: {
							base: nextBase,
						},
					},
				],
				this.ioc,
			),
		);
	}

	private detectHandle(shape: BaseShape, vp: Point, scale: number): ResizeDirection | null {
		const threshold = HANDLE_HIT_RADIUS / scale;
		const border = shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder) as SelectedBorder;
		const { left, top, right, bottom } = border.getHandleBounds();

		// 转换到容器本地坐标，适配旋转后的 resize 热区检测
		const local = shape.container.toLocal(new PixiPoint(vp.x, vp.y));

		const corners: { px: number; py: number; dir: ResizeDirection }[] = [
			{ px: left, py: top, dir: ResizeDirection.TL },
			{ px: right, py: top, dir: ResizeDirection.TR },
			{ px: right, py: bottom, dir: ResizeDirection.BR },
			{ px: left, py: bottom, dir: ResizeDirection.BL },
		];

		for (const c of corners) {
			if (Math.abs(local.x - c.px) < threshold && Math.abs(local.y - c.py) < threshold) {
				return c.dir;
			}
		}

		// 边缘检测：排除角落区域，避免与角落 handle 冲突
		const cornerExclude = threshold * 2;
		const edges: {
			check: () => boolean;
			dir: ResizeDirection;
		}[] = [
			{
				check: () =>
					Math.abs(local.y - top) < threshold &&
					local.x > left + cornerExclude &&
					local.x < right - cornerExclude,
				dir: ResizeDirection.T,
			},
			{
				check: () =>
					Math.abs(local.x - right) < threshold &&
					local.y > top + cornerExclude &&
					local.y < bottom - cornerExclude,
				dir: ResizeDirection.R,
			},
			{
				check: () =>
					Math.abs(local.y - bottom) < threshold &&
					local.x > left + cornerExclude &&
					local.x < right - cornerExclude,
				dir: ResizeDirection.B,
			},
			{
				check: () =>
					Math.abs(local.x - left) < threshold &&
					local.y > top + cornerExclude &&
					local.y < bottom - cornerExclude,
				dir: ResizeDirection.L,
			},
		];

		for (const edge of edges) {
			if (edge.check()) {
				return edge.dir;
			}
		}

		return null;
	}

	private reset() {
		this.isResizing = false;
		this.resizingShape = null;
		this.direction = null;
		this.startViewportPoint = null;
		this.originBaseProps = null;
	}
}
