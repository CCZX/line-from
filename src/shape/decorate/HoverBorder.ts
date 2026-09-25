import { Graphics } from '@pixi/graphics';
import { DECORATE_COLORS } from '@lineform/common/color';
import { ShapeDecorateTypeEnum, ShapePropertyEnum } from '../contract';
import type { StrokePropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';
import { AbsDecorate, type DecorateViewport } from './AbsDecorate';
import { StrokeProperty } from '../property/StrokeProperty';

const BORDER_PADDING = 2;

export class HoverBorder extends AbsDecorate {
	public type: ShapeDecorateTypeEnum = ShapeDecorateTypeEnum.HoverBorder;

	public graphics: Graphics;

	constructor(shape: BaseShape, viewport: DecorateViewport) {
		super(shape, viewport);
		this.graphics = new Graphics();
	}

	private draw(): void {
		const { width, height } = this.shape.getBounds();
		const stroke = this.shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke).value;
		const strokeWidth = stroke?.width || 0;
		const scale = this.getViewportScale();
		const offset = strokeWidth / 2 + BORDER_PADDING / scale;

		this.graphics.clear();
		this.graphics.lineStyle(2 / scale, DECORATE_COLORS.hoverBorder, 1);
		this.graphics.beginFill(DECORATE_COLORS.handleSurface, 0);
		this.graphics.drawRect(0 - offset, 0 - offset, width + offset * 2, height + offset * 2);
	}

	public onActivate() {
		this.draw();
		this.shape.container.addChild(this.graphics);
		this.startViewportScaleSync();
	}

	public override refresh(): void {
		this.draw();
	}

	public onDeactivate() {
		this.stopViewportScaleSync();
		this.shape.container.removeChild(this.graphics);
	}
}
