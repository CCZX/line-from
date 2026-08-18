import { Graphics } from '@pixi/graphics';
import {
	FillPropertyValue,
	ResizeDirection,
	ShapeContext,
	ShapeResizeRequest,
	ShapeTypeEnum,
	StrokePropertyValue,
} from './contract';
import { ClosedShape } from './ClosedShape';
import { drawSketchyCircle, drawSketchyFillCircle } from './property/style';
import type { TextLayoutBounds } from './TextEditableShape';

const SELECTION_BORDER_INSET = 3;

export class Circle extends ClosedShape {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Circle;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}

	public override getTextLayoutBounds(): TextLayoutBounds {
		const { width, height } = this.getWH();
		const padding = this.getTextPadding();
		const side = Math.max(0, Math.min(width, height) / Math.sqrt(2) - padding * 2);
		return {
			x: (width - side) / 2,
			y: (height - side) / 2,
			width: side,
			height: side,
		};
	}

	public override getSelectionBorderInset(viewportScale: number): number {
		return SELECTION_BORDER_INSET / viewportScale;
	}

	public override resolveResize(request: ShapeResizeRequest) {
		const { x, y, width } = request.origin;
		const { deltaX, deltaY, minSize, direction } = request;
		const diameter = width;
		let nextX = x;
		let nextY = y;
		let nextDiameter = diameter;

		switch (direction) {
			case ResizeDirection.T:
				nextDiameter = Math.max(minSize, diameter - deltaY);
				nextX = x + (diameter - nextDiameter) / 2;
				nextY = y + diameter - nextDiameter;
				break;
			case ResizeDirection.B:
				nextDiameter = Math.max(minSize, diameter + deltaY);
				nextX = x + (diameter - nextDiameter) / 2;
				break;
			case ResizeDirection.L:
				nextDiameter = Math.max(minSize, diameter - deltaX);
				nextX = x + diameter - nextDiameter;
				nextY = y + (diameter - nextDiameter) / 2;
				break;
			case ResizeDirection.R:
				nextDiameter = Math.max(minSize, diameter + deltaX);
				nextY = y + (diameter - nextDiameter) / 2;
				break;
			case ResizeDirection.BR:
				nextDiameter = Math.max(minSize, Math.max(diameter + deltaX, diameter + deltaY));
				break;
			case ResizeDirection.TL:
				nextDiameter = Math.max(minSize, Math.max(diameter - deltaX, diameter - deltaY));
				nextX = x + diameter - nextDiameter;
				nextY = y + diameter - nextDiameter;
				break;
			case ResizeDirection.TR:
				nextDiameter = Math.max(minSize, Math.max(diameter + deltaX, diameter - deltaY));
				nextY = y + diameter - nextDiameter;
				break;
			case ResizeDirection.BL:
				nextDiameter = Math.max(minSize, Math.max(diameter - deltaX, diameter + deltaY));
				nextX = x + diameter - nextDiameter;
				break;
		}

		return {
			...request.proposed,
			x: nextX,
			y: nextY,
			width: nextDiameter,
			height: nextDiameter,
		};
	}

	protected override prepareGraphics(width: number, height: number): void {
		this.graphics.position.set(width / 2, height / 2);
	}

	protected drawPath(graphics: Graphics, width: number, _height: number): void {
		graphics.drawCircle(0, 0, width / 2);
	}

	protected drawSketchyFill(
		graphics: Graphics,
		width: number,
		_height: number,
		value: FillPropertyValue,
	): void {
		drawSketchyFillCircle(graphics, 0, 0, width / 2, value.color, value.alpha, value.seed!);
	}

	protected drawSketchyStroke(
		graphics: Graphics,
		width: number,
		_height: number,
		value: StrokePropertyValue,
	): void {
		drawSketchyCircle(graphics, 0, 0, width / 2, value.seed!);
	}
}
