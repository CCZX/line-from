import { Graphics } from 'pixi.js';
import { ShapeContext, ShapeTypeEnum } from './contract';
import { TextEditableShape } from './TextEditableShape';

export class Rectangle extends TextEditableShape<Graphics> {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Rectangle;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}
}
