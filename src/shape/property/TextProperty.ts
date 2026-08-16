import { AbsProperty } from './AbsProperty';
import { TextPropertyValue } from '../contract';
import type { TextEditableShape } from '../TextEditableShape';

const DEFAULT_VALUE: TextPropertyValue = { text: '' };

export class TextProperty extends AbsProperty<TextPropertyValue> {
	public declare shape: TextEditableShape;

	constructor(shape: TextEditableShape, value?: TextPropertyValue) {
		super(shape, { ...DEFAULT_VALUE, ...value });
	}

	public draw(): void {
		this.shape.redraw();
	}
}
