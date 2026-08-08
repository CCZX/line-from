import { AbsProperty } from './AbsProperty';
import { ShapeTypeEnum, TextPropertyValue } from '../contract';
import { TextStyle } from 'pixi.js';
import type { TextEditableShape } from '../TextEditableShape';
import { SHAPE_COLORS } from '@/common/color';

const DEFAULT_VALUE: TextPropertyValue = { text: '' };

export class TextProperty extends AbsProperty<TextPropertyValue> {
	public declare shape: TextEditableShape;

	constructor(shape: TextEditableShape, value?: TextPropertyValue) {
		super(shape, { ...DEFAULT_VALUE, ...value });
	}

	public draw(): void {
		const isStandaloneText = this.shape.type === ShapeTypeEnum.Text;
		const horizontalAlign = this.value.horizontalAlign ?? (isStandaloneText ? 'left' : 'center');

		this.shape.textView.text = this.value.text;
		this.shape.textView.style = new TextStyle({
			fill: this.value.color ?? SHAPE_COLORS.text.default,
			fontSize: this.value.fontSize ?? 16,
			fontFamily:
				this.value.fontFamily ??
				"-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
			fontWeight: this.value.fontWeight ?? 'normal',
			lineHeight: this.value.lineHeight,
			align: horizontalAlign,
			wordWrap: true,
		});
		this.shape.layoutText();
	}
}
