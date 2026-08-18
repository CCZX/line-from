import { Text as PixiText } from '@pixi/text';
import { ShapeContext, ShapeTypeEnum } from './contract';
import { TextEditableShape, type TextLayoutBounds } from './TextEditableShape';

export class Text extends TextEditableShape<PixiText> {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Text;
	}

	constructor(id: string, context: ShapeContext) {
		const textView = new PixiText();
		super(id, textView, context, textView);
	}

	public override getTextLayoutBounds(): TextLayoutBounds {
		const { width, height } = this.getWH();
		return { x: 0, y: 0, width, height };
	}

	protected override getDefaultHorizontalAlign(): 'left' {
		return 'left';
	}

	protected override getDefaultVerticalAlign(): 'top' {
		return 'top';
	}

	protected override shouldDrawTextBackground(): boolean {
		return false;
	}
}
