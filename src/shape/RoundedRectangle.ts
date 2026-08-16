import { Graphics } from '@pixi/graphics';
import { FillPropertyValue, ShapeContext, ShapeTypeEnum, StrokePropertyValue } from './contract';
import { getRoundedRectRadius, isPointInRoundedRect } from './geometry';
import { ClosedShape } from './ClosedShape';
import { drawSketchyFillRoundedRect, drawSketchyRoundedRect } from './property/style';

export class RoundedRectangle extends ClosedShape {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.RoundedRectangle;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}

	public containsPoint(localPoint: Point): boolean {
		const { width, height } = this.getWH();
		return isPointInRoundedRect(localPoint, width, height, getRoundedRectRadius(width, height));
	}

	protected drawPath(graphics: Graphics, width: number, height: number): void {
		graphics.drawRoundedRect(0, 0, width, height, getRoundedRectRadius(width, height));
	}

	protected drawSketchyFill(
		graphics: Graphics,
		width: number,
		height: number,
		value: FillPropertyValue,
	): void {
		drawSketchyFillRoundedRect(
			graphics,
			0,
			0,
			width,
			height,
			getRoundedRectRadius(width, height),
			value.color,
			value.alpha,
			value.seed!,
		);
	}

	protected drawSketchyStroke(
		graphics: Graphics,
		width: number,
		height: number,
		value: StrokePropertyValue,
	): void {
		drawSketchyRoundedRect(
			graphics,
			0,
			0,
			width,
			height,
			getRoundedRectRadius(width, height),
			value.seed!,
		);
	}
}
