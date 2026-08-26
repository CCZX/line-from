import { Graphics } from '@pixi/graphics';
import { FillPropertyValue, ShapeContext, ShapeTypeEnum, StrokePropertyValue } from './contract';
import { distToSegment, getDiamondPoints, isPointInDiamond } from './geometry';
import { ClosedShape } from './ClosedShape';
import { drawSketchyDiamond, drawSketchyFillDiamond } from './property/style';
import type { TextLayoutBounds } from './TextEditableShape';

export class Diamond extends ClosedShape {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Diamond;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}

	public override containsPoint(localPoint: Point): boolean {
		const { width, height } = this.getWH();
		return isPointInDiamond(localPoint, width, height);
	}

	public override distanceToPoint(localPoint: Point): number {
		const { width, height } = this.getWH();
		if (isPointInDiamond(localPoint, width, height)) {
			return 0;
		}

		const points = getDiamondPoints(width, height);
		return Math.min(
			...points.map((point, index) =>
				distToSegment(localPoint, point, points[(index + 1) % points.length]),
			),
		);
	}

	public override getTextLayoutBounds(): TextLayoutBounds {
		const { width, height } = this.getWH();
		const padding = this.getTextPadding();
		return {
			x: width / 4 + padding,
			y: height / 4 + padding,
			width: Math.max(0, width / 2 - padding * 2),
			height: Math.max(0, height / 2 - padding * 2),
		};
	}

	protected drawPath(graphics: Graphics, width: number, height: number): void {
		graphics.drawPolygon(getDiamondPoints(width, height).flatMap(({ x, y }) => [x, y]));
	}

	protected drawSketchyFill(
		graphics: Graphics,
		width: number,
		height: number,
		value: FillPropertyValue,
	): void {
		drawSketchyFillDiamond(graphics, 0, 0, width, height, value.color, value.alpha, value.seed!);
	}

	protected drawSketchyStroke(
		graphics: Graphics,
		width: number,
		height: number,
		value: StrokePropertyValue,
	): void {
		drawSketchyDiamond(graphics, 0, 0, width, height, value.seed!);
	}
}
