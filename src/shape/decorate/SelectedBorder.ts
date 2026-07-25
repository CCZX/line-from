import { Graphics } from 'pixi.js';
import { HOVER_BORDER } from '../color';
import { ShapeDecorateTypeEnum, ShapePropertyEnum, ShapeTypeEnum } from '../contract';
import type { StrokePropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';
import { AbsDecorate } from './AbsDecorate';
import { StrokeProperty } from '../property/StrokeProperty';

const HANDLE_RADIUS = 5;
const BORDER_PADDING = 2;
const CIRCLE_BORDER_INSET = 3;
const ROTATE_HANDLE_RADIUS = 4;
const ROTATE_HANDLE_DISTANCE = 16;

export class SelectedBorder extends AbsDecorate {
	public type: ShapeDecorateTypeEnum = ShapeDecorateTypeEnum.SelectedBorder;

	public graphics: Graphics;

	constructor(shape: BaseShape) {
		super(shape);
		this.graphics = new Graphics();
		this.graphics.name = ShapeDecorateTypeEnum.SelectedBorder;
	}

	private getStrokeWidth(): number {
		const stroke = this.shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke).value;
		return stroke?.width || 0;
	}

	public getHandleBounds(): { left: number; top: number; right: number; bottom: number } {
		const { width, height } = this.shape.getBounds();
		const offset = this.getStrokeWidth() / 2 + BORDER_PADDING;
		const inset = this.shape.type === ShapeTypeEnum.Circle ? CIRCLE_BORDER_INSET : 0;

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

		this.graphics.clear();
		this.graphics.lineStyle(1, HOVER_BORDER, 1);
		this.graphics.beginFill(0xfff, 0);
		this.graphics.drawRect(left - 0.5, top - 0.5, width + 0.5, height + 0.5);

		this.graphics.beginFill(0xffffff, 1);
		this.graphics.lineStyle(1, HOVER_BORDER, 1);
		this.graphics.drawCircle(left, top, HANDLE_RADIUS);
		this.graphics.drawCircle(right, top, HANDLE_RADIUS);
		this.graphics.drawCircle(right, bottom, HANDLE_RADIUS);
		this.graphics.drawCircle(left, bottom, HANDLE_RADIUS);

		// 旋转 handle：顶部中间的圆点 + 连接线
		const centerX = (left + right) / 2;
		const rotateY = top - ROTATE_HANDLE_DISTANCE;
		this.graphics.lineStyle(1, HOVER_BORDER, 1);
		this.graphics.moveTo(centerX, top);
		this.graphics.lineTo(centerX, rotateY);
		this.graphics.beginFill(0xffffff, 1);
		this.graphics.drawCircle(centerX, rotateY, ROTATE_HANDLE_RADIUS);
		this.graphics.endFill();
	}

	public onActivate() {
		this.draw();
		this.shape.container.addChild(this.graphics);
	}

	public refresh() {
		this.draw();
	}

	public getRotateHandleCenter(): { x: number; y: number } {
		const { left, top, right } = this.getHandleBounds();
		return { x: (left + right) / 2, y: top - ROTATE_HANDLE_DISTANCE };
	}

	public onDeactivate() {
		this.shape.container.removeChild(this.graphics);
	}
}
