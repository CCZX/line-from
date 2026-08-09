import { Point as PixiPoint } from 'pixi.js';
import { BaseShape } from '@/shape/BaseShape';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { SelectedBorder } from '@/shape/decorate/SelectedBorder';
import {
	BasePropertyValue,
	ShapeDecorateTypeEnum,
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
} from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

const ROTATE_HANDLE_HIT_RADIUS = 12;

@provide(IHandlerWithInteraction)
export class RotateHandler implements IHandler {
	public type = HandlerEnum.Rotate;
	public sort = 30;

	@inject(ISelectService)
	private selectService!: ISelectService;

	private isRotating = false;
	private rotatingShape: BaseShape | null = null;
	private originRotation = 0;
	private startPointerAngle = 0;

	public enable(_state: InteractionState): boolean {
		const selectedShapes = this.selectService.getSelectedShapes();
		// 线没有旋转手柄（LineSelectedBorder 不提供 getRotateHandleCenter）
		return selectedShapes.length === 1 && selectedShapes[0].type !== ShapeTypeEnum.Line;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointermove':
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
		if (this.isRotating) {
			document.body.style.cursor = 'grabbing';
			this.applyRotate(payload.viewportPoint);
			return false;
		}

		if (this.isOverRotateHandle(this.selectService.getSelectedShapes()[0], payload.viewportPoint)) {
			document.body.style.cursor = 'grabbing';
			return false;
		}

		return true;
	}

	private handlePointerDown(payload: EventPayload): boolean {
		const shape = this.selectService.getSelectedShapes()[0];
		if (!this.isOverRotateHandle(shape, payload.viewportPoint)) {
			return true;
		}

		const p = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get() as BasePropertyValue;
		this.originRotation = p.rotation || 0;
		this.startPointerAngle = this.getPointerAngle(shape, payload.viewportPoint);

		this.isRotating = true;
		this.rotatingShape = shape;
		this.rotatingShape.setState(ShapeStateEnum.Rotating);

		return false;
	}

	private handlePointerUp(): boolean {
		if (!this.isRotating) {
			return true;
		}

		this.rotatingShape?.setState(ShapeStateEnum.Selected);
		this.reset();
		document.body.style.cursor = 'default';
		return false;
	}

	private applyRotate(vp: Point) {
		if (!this.rotatingShape) {
			return;
		}

		const pointerAngle = this.getPointerAngle(this.rotatingShape, vp);
		const angle = this.originRotation + pointerAngle - this.startPointerAngle;

		// 规范化角度为 0-360
		const normalized = ((angle % 360) + 360) % 360;

		this.rotatingShape.updateProperty(ShapePropertyEnum.Base, {
			rotation: normalized,
		});
	}

	private isOverRotateHandle(shape: BaseShape, vp: Point): boolean {
		const border = shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder) as SelectedBorder;
		if (!border) {
			return false;
		}

		const localCenter = border.getRotateHandleCenter();
		// 转换到世界坐标
		const global = shape.container.toGlobal(new PixiPoint(localCenter.x, localCenter.y));
		const threshold = ROTATE_HANDLE_HIT_RADIUS;

		return Math.abs(vp.x - global.x) < threshold && Math.abs(vp.y - global.y) < threshold;
	}

	/**
	 * 正右方：0°
	 * 正下方：90°
	 * 正左方：180° 或 -180°
	 * 正上方：-90°
	 */
	private getPointerAngle(shape: BaseShape, vp: Point): number {
		// pivot 是图形的旋转中心；转成全局坐标后可正确适配视口缩放和平移。
		const center = shape.container.toGlobal(
			new PixiPoint(shape.container.pivot.x, shape.container.pivot.y),
		);
		return Math.atan2(vp.y - center.y, vp.x - center.x) * (180 / Math.PI);
	}

	private reset() {
		this.isRotating = false;
		this.rotatingShape = null;
		this.originRotation = 0;
		this.startPointerAngle = 0;
	}
}
