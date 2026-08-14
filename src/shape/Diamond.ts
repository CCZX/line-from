import { Graphics } from '@pixi/graphics';
import { ShapeContext, ShapeTypeEnum } from './contract';
import { isPointInDiamond } from './geometry';
import { TextEditableShape } from './TextEditableShape';

export class Diamond extends TextEditableShape<Graphics> {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Diamond;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}

	public containsPoint(localPoint: Point): boolean {
		const { width, height } = this.getWH();
		return isPointInDiamond(localPoint, width, height);
	}
}
