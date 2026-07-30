import { Graphics } from 'pixi.js';
import { AbsProperty } from './AbsProperty';
import { FillPropertyValue, ShapeTypeEnum } from '../contract';
import { BaseShape } from '../BaseShape';
import { getHatchTexture } from './hatch';
import { drawSketchyFillCircle, drawSketchyFillRect } from './style';

const DEFAULT_VALUE: FillPropertyValue = { color: 0x000, alpha: 1, style: 'solid' };

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

	public set(value: FillPropertyValue): void {
		this.value = withSketchySeed(value);
		this.shape.redraw();
	}

	public update(value: Partial<FillPropertyValue>): void {
		const merged = { ...this.value, ...value };
		if (merged.style === 'sketchy' && merged.seed == null) {
			merged.seed = Math.floor(Math.random() * 1_000_000_000);
		}
		this.value = merged;
		// 触发完整重绘，避免填充叠层
		this.shape.redraw();
	}

	public draw(): void {
		const { width, height } = this.shape.getWH();
		const g = this.shape.graphics as Graphics;
		const style = this.value.style ?? 'solid';

		if (this.shape.type === ShapeTypeEnum.Circle) {
			if (style === 'sketchy' && this.value.seed != null) {
				drawSketchyFillCircle(
					g,
					0,
					0,
					width / 2,
					this.value.color,
					this.value.alpha,
					this.value.seed,
				);
				return;
			}

			if (style === 'hatch') {
				g.beginTextureFill({
					texture: getHatchTexture(),
					color: this.value.color,
					alpha: this.value.alpha,
				});
			} else {
				g.beginFill(this.value.color, this.value.alpha);
			}
			g.drawCircle(0, 0, width / 2);
			g.endFill();
		}

		if (this.shape.type === ShapeTypeEnum.Rectangle) {
			if (style === 'sketchy' && this.value.seed != null) {
				drawSketchyFillRect(
					g,
					0,
					0,
					width,
					height,
					this.value.color,
					this.value.alpha,
					this.value.seed,
				);
				return;
			}

			if (style === 'hatch') {
				g.beginTextureFill({
					texture: getHatchTexture(),
					color: this.value.color,
					alpha: this.value.alpha,
				});
			} else {
				g.beginFill(this.value.color, this.value.alpha);
			}
			g.drawRect(0, 0, width, height);
			g.endFill();
		}
	}
}
