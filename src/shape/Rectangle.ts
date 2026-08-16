import { Graphics } from '@pixi/graphics';
import { FillPropertyValue, ShapeContext, ShapeTypeEnum, StrokePropertyValue } from './contract';
import { ClosedShape } from './ClosedShape';
import { drawSketchyFillRect, drawSketchyRect } from './property/style';

export class Rectangle extends ClosedShape {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Rectangle;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}

	protected drawPath(graphics: Graphics, width: number, height: number): void {
		graphics.drawRect(0, 0, width, height);
	}

	protected drawSketchyFill(
		graphics: Graphics,
		width: number,
		height: number,
		value: FillPropertyValue,
	): void {
		drawSketchyFillRect(graphics, 0, 0, width, height, value.color, value.alpha, value.seed!);
	}

	protected drawSketchyStroke(
		graphics: Graphics,
		width: number,
		height: number,
		value: StrokePropertyValue,
	): void {
		drawSketchyRect(graphics, 0, 0, width, height, value.seed!);
	}
}
