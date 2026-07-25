import { Graphics } from 'pixi.js';
import { HOVER_BORDER } from '../color';
import { ShapeDecorateTypeEnum, ShapePropertyEnum } from '../contract';
import type { StrokePropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';
import { AbsDecorate } from './AbsDecorate';
import { StrokeProperty } from '../property/StrokeProperty';

const BORDER_PADDING = 2;

export class HoverBorder extends AbsDecorate {
	public type: ShapeDecorateTypeEnum = ShapeDecorateTypeEnum.HoverBorder;

	public graphics: Graphics;

	constructor(shape: BaseShape) {
		super(shape);
		this.graphics = new Graphics();
		this.graphics.name = ShapeDecorateTypeEnum.HoverBorder;
	}

	public onActivate() {
		const { width, height } = this.shape.getBounds();

		const stroke = this.shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke).value;
		const strokeWidth = stroke?.width || 0;
		const offset = strokeWidth / 2 + BORDER_PADDING;

		const graphics = new Graphics();
		this.graphics = graphics;
		this.graphics.lineStyle(2, HOVER_BORDER, 1);
		this.graphics.beginFill(0xfff, 0);
		this.graphics.drawRect(0 - offset, 0 - offset, width + offset * 2, height + offset * 2);

		this.shape.container.addChild(this.graphics);
	}

	public onDeactivate() {
		this.shape.container.removeChild(this.graphics);
	}
}
