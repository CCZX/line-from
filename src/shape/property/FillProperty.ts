import { AbsProperty } from './AbsProperty';
import { FillPropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';
import { SHAPE_COLORS } from '@lineform/common/color';

const DEFAULT_VALUE: FillPropertyValue = {
	color: SHAPE_COLORS.background.fallback,
	alpha: 1,
	style: 'solid',
};

function withSketchySeed(value: FillPropertyValue): FillPropertyValue {
	if (value.style === 'sketchy' && value.seed == null) {
		return { ...value, seed: Math.floor(Math.random() * 1_000_000_000) };
	}
	return value;
}

export class FillProperty extends AbsProperty<FillPropertyValue> {
	constructor(shape: BaseShape, value?: FillPropertyValue) {
		super(shape, withSketchySeed(value || DEFAULT_VALUE));
	}

	public override set(value: FillPropertyValue): void {
		this.value = withSketchySeed(value);
		this.shape.redraw();
	}

	public override update(value: Partial<FillPropertyValue>): void {
		const merged = { ...this.value, ...value };
		if (merged.style === 'sketchy' && merged.seed == null) {
			merged.seed = Math.floor(Math.random() * 1_000_000_000);
		}
		this.value = merged;
		// 触发完整重绘，避免填充叠层
		this.shape.redraw();
	}

	public draw(): void {
		this.shape.redraw();
	}
}
