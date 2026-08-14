import { Graphics } from '@pixi/graphics';
import { ShapeContext, ShapeTypeEnum } from './contract';
import { getRoundedRectRadius, isPointInRoundedRect } from './geometry';
import { TextEditableShape } from './TextEditableShape';

export class RoundedRectangle extends TextEditableShape<Graphics> {
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
}
