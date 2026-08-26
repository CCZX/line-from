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

	public override containsPoint(localPoint: Point): boolean {
		const { width, height } = this.getWH();
		return isPointInRoundedRect(localPoint, width, height, getRoundedRectRadius(width, height));
	}

	public override distanceToPoint(localPoint: Point): number {
		const { width, height } = this.getWH();
		const radius = getRoundedRectRadius(width, height);
		const x = Math.abs(localPoint.x - width / 2) - (width / 2 - radius);
		const y = Math.abs(localPoint.y - height / 2) - (height / 2 - radius);
		const signedDistance =
			Math.hypot(Math.max(x, 0), Math.max(y, 0)) + Math.min(Math.max(x, y), 0) - radius;
		return Math.max(0, signedDistance);
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
