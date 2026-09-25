import { AbsProperty } from './AbsProperty';
import { StrokePropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';
import { SHAPE_COLORS } from '@lineform/common/color';

const DEFAULT_VALUE: StrokePropertyValue = {
	color: SHAPE_COLORS.border.fallback,
	width: 0,
	alpha: 1,
	style: 'regular',
};

function withSketchySeed(value: StrokePropertyValue): StrokePropertyValue {
	if (value.style === 'sketchy' && value.seed == null) {
		return { ...value, seed: Math.floor(Math.random() * 1_000_000_000) };
	}
	return value;
}

export class StrokeProperty extends AbsProperty<StrokePropertyValue> {
	constructor(shape: BaseShape, value?: StrokePropertyValue) {
		super(shape, withSketchySeed(value || DEFAULT_VALUE));
	}

	public override set(value: StrokePropertyValue): void {
		this.value = withSketchySeed(value);
		this.shape.redraw();
	}

	public override update(value: Partial<StrokePropertyValue>): void {
		const merged = { ...this.value, ...value };
		if (merged.style === 'sketchy' && merged.seed == null) {
			merged.seed = Math.floor(Math.random() * 1_000_000_000);
		}
		this.value = merged;
		// 触发完整重绘，避免 stroke 叠层
		this.shape.redraw();
	}

	public draw(): void {
		this.shape.redraw();
	}
}
