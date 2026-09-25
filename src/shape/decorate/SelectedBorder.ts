import { Graphics } from '@pixi/graphics';
import { DECORATE_COLORS } from '@lineform/common/color';
import { ShapeDecorateTypeEnum, ShapePropertyEnum } from '../contract';
import type { StrokePropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';
import { AbsDecorate, type DecorateViewport } from './AbsDecorate';
import { StrokeProperty } from '../property/StrokeProperty';

const HANDLE_RADIUS = 5;
const BORDER_PADDING = 2;
const ROTATE_HANDLE_RADIUS = 4;
const ROTATE_HANDLE_DISTANCE = 16;
const CONNECTION_HANDLE_RADIUS = 4;

export type ConnectionAnchor = 'top' | 'right' | 'bottom' | 'left';

export class SelectedBorder extends AbsDecorate {
	public type: ShapeDecorateTypeEnum = ShapeDecorateTypeEnum.SelectedBorder;

	public graphics: Graphics;

	constructor(shape: BaseShape, viewport: DecorateViewport) {
		super(shape, viewport);
		this.graphics = new Graphics();
	}

	private getStrokeWidth(): number {
		const stroke = this.shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke).value;
		return stroke?.width || 0;
	}

	public getHandleBounds(): { left: number; top: number; right: number; bottom: number } {
		const { width, height } = this.shape.getBounds();
		const scale = this.getViewportScale();
		const offset = this.getStrokeWidth() / 2 + BORDER_PADDING / scale;
		const inset = this.shape.getSelectionBorderInset(scale);

		return {
			left: 0 - offset + inset,
			top: 0 - offset + inset,
			right: width + offset - inset,
			bottom: height + offset - inset,
		};
	}

	private draw() {
		const { left, top, right, bottom } = this.getHandleBounds();
		const width = right - left;
		const height = bottom - top;
		const scale = this.getViewportScale();
		const lineWidth = 1 / scale;
		const halfPixel = 0.5 / scale;

		this.graphics.clear();
		this.graphics.lineStyle(lineWidth, DECORATE_COLORS.activeAccent, 1);
		this.graphics.beginFill(DECORATE_COLORS.handleSurface, 0);
		this.graphics.drawRect(
			left - halfPixel,
			top - halfPixel,
			width + halfPixel,
			height + halfPixel,
		);

		this.graphics.beginFill(DECORATE_COLORS.handleSurface, 1);
		this.graphics.lineStyle(lineWidth, DECORATE_COLORS.activeAccent, 1);
		this.graphics.drawCircle(left, top, HANDLE_RADIUS / scale);
		this.graphics.drawCircle(right, top, HANDLE_RADIUS / scale);
		this.graphics.drawCircle(right, bottom, HANDLE_RADIUS / scale);
		this.graphics.drawCircle(left, bottom, HANDLE_RADIUS / scale);

		// 旋转 handle：顶部中间的圆点 + 连接线
		const centerX = (left + right) / 2;
		const rotateY = top - ROTATE_HANDLE_DISTANCE / scale;
		this.graphics.lineStyle(lineWidth, DECORATE_COLORS.activeAccent, 1);
		this.graphics.moveTo(centerX, top);
		this.graphics.lineTo(centerX, rotateY);
		this.graphics.beginFill(DECORATE_COLORS.handleSurface, 1);
		this.graphics.drawCircle(centerX, rotateY, ROTATE_HANDLE_RADIUS / scale);
		this.graphics.endFill();

		// 四向连线锚点：拖拽任意圆点可快速创建连线
		this.graphics.lineStyle(lineWidth, DECORATE_COLORS.handleSurface, 1);
		this.graphics.beginFill(DECORATE_COLORS.activeAccent, 1);
		for (const point of Object.values(this.getConnectionHandleCenters())) {
			this.graphics.drawCircle(point.x, point.y, CONNECTION_HANDLE_RADIUS / scale);
		}
		this.graphics.endFill();
	}

	public onActivate() {
		this.draw();
		this.shape.container.addChild(this.graphics);
		this.startViewportScaleSync();
	}

	public override refresh() {
		this.draw();
	}

	public getRotateHandleCenter(): { x: number; y: number } {
		const { left, top, right } = this.getHandleBounds();
		return {
			x: (left + right) / 2,
			y: top - ROTATE_HANDLE_DISTANCE / this.getViewportScale(),
		};
	}

	public getConnectionHandleCenters(): Record<ConnectionAnchor, Point> {
		const { left, top, right, bottom } = this.getHandleBounds();
		const centerX = (left + right) / 2;
		const centerY = (top + bottom) / 2;

		return {
			top: { x: centerX, y: top },
			right: { x: right, y: centerY },
			bottom: { x: centerX, y: bottom },
			left: { x: left, y: centerY },
		};
	}

	public onDeactivate() {
		this.stopViewportScaleSync();
		this.shape.container.removeChild(this.graphics);
	}
}
