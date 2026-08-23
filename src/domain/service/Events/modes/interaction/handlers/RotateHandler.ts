import { BaseShape } from '@/shape/BaseShape';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { SelectedBorder } from '@/shape/decorate/SelectedBorder';
import {
	BasePropertyValue,
	ShapeDecorateTypeEnum,
	ShapePropertyEnum,
	ShapeStateEnum,
} from '@/shape/contract';
import { HandlerEnum, InteractionState, EventPayload } from '../../../../../contract/EventManager';
import { IHandlerWithInteraction, IHandler } from '@/domain/contract';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { ISelectService } from '@/domain/contract/SelectService';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { IocContainerService } from '@/common/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { IViewportService } from '@/domain/contract/ViewportService';
import { IMatrixService } from '@/common/contract/MatrixService';

const ROTATE_HANDLE_HIT_RADIUS = 12;

@provide(IHandlerWithInteraction)
export class RotateHandler implements IHandler {
	public type = HandlerEnum.Rotate;
	public sort = 30;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(IMatrixService)
	private matrixService!: IMatrixService;

	private isRotating = false;
	private rotatingShape: BaseShape | null = null;
	private originRotation = 0;
	private startPointerVector: Point | null = null;

	public enable(_state: InteractionState): boolean {
		const selectedShapes = this.selectService.getSelectedShapes();
		// 线没有旋转手柄（LineSelectedBorder 不提供 getRotateHandleCenter）
		return selectedShapes.length === 1 && selectedShapes[0].supportsRotation;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointermove':
				// 鼠标在画布外松开时可能收不到 pointerup，主动结束本次流式操作。
				if (e.buttons !== 1 && this.isRotating) {
					return this.finishRotate();
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
		if (this.isRotating) {
			document.body.style.cursor = 'grabbing';
			this.applyRotate(payload.viewportPoint);
			return false;
		}

		if (this.isOverRotateHandle(this.selectService.getSelectedShapes()[0], payload)) {
			document.body.style.cursor = 'grabbing';
			return false;
		}

		return true;
	}

	private handlePointerDown(payload: EventPayload): boolean {
		const shape = this.selectService.getSelectedShapes()[0];
		if (!this.isOverRotateHandle(shape, payload)) {
			return true;
		}

		const p = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get() as BasePropertyValue;
		this.originRotation = p.rotation || 0;
		this.startPointerVector = this.getPointerVector(shape, payload.viewportPoint);
		this.actionLogManager.setStreamStart();

		this.isRotating = true;
		this.rotatingShape = shape;
		this.rotatingShape.setState(ShapeStateEnum.Rotating);

		return false;
	}

	private handlePointerUp(): boolean {
		if (!this.isRotating) {
			return true;
		}

		return this.finishRotate();
	}

	private applyRotate(viewportPoint: Point) {
		if (!this.rotatingShape || !this.startPointerVector) {
			return;
		}

		const pointerVector = this.getPointerVector(this.rotatingShape, viewportPoint);
		const deltaRotation = this.matrixService.rotationBetweenVectors(
			this.startPointerVector,
			pointerVector,
		);
		const nextRotation = this.matrixService.composeMatrices(
			deltaRotation,
			this.matrixService.rotationMatrix(this.originRotation),
		);
		const normalized = this.matrixService.normalizeDegrees(
			this.matrixService.getMatrixRotation(nextRotation),
		);

		const base = this.rotatingShape
			.getProperty<BaseProperty>(ShapePropertyEnum.Base)
			.get() as BasePropertyValue;
		const currentRotation = base.rotation ?? 0;
		const rotationDelta = Math.abs(normalized - currentRotation);
		if (Math.min(rotationDelta, 360 - rotationDelta) < 0.01) {
			return;
		}

		this.actionManager.push(
			new UpdatePropsAction(
				[
					{
						id: this.rotatingShape.id,
						type: this.rotatingShape.type,
						properties: { base: { ...base, rotation: normalized } },
					},
				],
				this.ioc,
			),
		);
	}

	private finishRotate(): boolean {
		this.actionLogManager.setStreamEnd();
		this.rotatingShape?.setState(ShapeStateEnum.Selected);
		this.reset();
		document.body.style.cursor = 'default';
		return false;
	}

	private isOverRotateHandle(shape: BaseShape, payload: EventPayload): boolean {
		const border = shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder) as SelectedBorder;
		if (!border) {
			return false;
		}

		const localCenter = border.getRotateHandleCenter();
		const base = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get() as BasePropertyValue;
		const global = this.matrixService.transformPoint(this.createShapeMatrix(base), localCenter);
		const worldPoint = this.toWorldPoint(payload.viewportPoint);
		const threshold = ROTATE_HANDLE_HIT_RADIUS / payload.scale;

		return (
			Math.abs(worldPoint.x - global.x) < threshold && Math.abs(worldPoint.y - global.y) < threshold
		);
	}

	private getPointerVector(shape: BaseShape, viewportPoint: Point): Point {
		const base = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get() as BasePropertyValue;
		const matrix = this.createShapeMatrix(base);
		const center = this.matrixService.transformPoint(matrix, {
			x: base.width / 2,
			y: base.height / 2,
		});
		const worldPoint = this.toWorldPoint(viewportPoint);
		return this.matrixService.transformPoint(
			this.matrixService.translationMatrix(-center.x, -center.y),
			worldPoint,
		);
	}

	private createShapeMatrix(base: BasePropertyValue) {
		return this.matrixService.createBoxTransformMatrix(base);
	}

	private toWorldPoint(viewportPoint: Point): Point {
		return (
			this.viewportService?.clientToViewportLocal(viewportPoint.x, viewportPoint.y) ?? viewportPoint
		);
	}

	private reset() {
		this.isRotating = false;
		this.rotatingShape = null;
		this.originRotation = 0;
		this.startPointerVector = null;
	}
}
