import { Graphics } from 'pixi.js';
import { AbsProperty } from './AbsProperty';
import { StrokePropertyValue, ShapePropertyEnum, ShapeTypeEnum } from '../contract';
import { BaseShape } from '../BaseShape';
import { BaseProperty } from './BaseProperty';
import { applyLineStyle, drawSketchyCircle, drawSketchyRect } from './style';

const DEFAULT_VALUE: StrokePropertyValue = {
	color: 0x000000,
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

	public set(value: StrokePropertyValue): void {
		this.value = withSketchySeed(value);
		this.draw();
	}

	public update(value: Partial<StrokePropertyValue>): void {
		const merged = { ...this.value, ...value };
		if (merged.style === 'sketchy' && merged.seed == null) {
			merged.seed = Math.floor(Math.random() * 1_000_000_000);
		}
		this.value = merged;
		// 触发完整重绘，避免 stroke 叠层
		this.shape.getProperty<BaseProperty>(ShapePropertyEnum.Base)?.draw(true);
	}

	public draw(): void {
		if (this.value.width <= 0) {
			return;
		}

		const { width, height } = this.shape.getWH();
		const g = this.shape.graphics as Graphics;
		const style = this.value.style ?? 'regular';

		applyLineStyle(g, {
			width: this.value.width,
			color: this.value.color,
			alpha: this.value.alpha,
		});

		if (this.shape.type === ShapeTypeEnum.Rectangle) {
			if (style === 'sketchy' && this.value.seed != null) {
				drawSketchyRect(g, 0, 0, width, height, this.value.seed);
			} else {
				g.drawRect(0, 0, width, height);
			}
		}

		if (this.shape.type === ShapeTypeEnum.Circle) {
			if (style === 'sketchy' && this.value.seed != null) {
				drawSketchyCircle(g, 0, 0, width / 2, this.value.seed);
			} else {
				g.drawCircle(0, 0, width / 2);
			}
		}

		g.lineStyle(0);
	}
}
