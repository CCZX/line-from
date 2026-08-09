import { Text as PixiText } from '@pixi/text';
import { ShapeContext, ShapeTypeEnum } from './contract';
import { TextEditableShape } from './TextEditableShape';

export class Text extends TextEditableShape<PixiText> {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Text;
	}

	constructor(id: string, context: ShapeContext) {
		const textView = new PixiText();
		super(id, textView, context, textView);
	}
}
