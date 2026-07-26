import { Graphics } from 'pixi.js';
import { ShapeContext, ShapeTypeEnum } from './contract';
import { TextEditableShape } from './TextEditableShape';

export class Circle extends TextEditableShape<Graphics> {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Circle;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
		this.graphics.interactive = true;
	}
}
