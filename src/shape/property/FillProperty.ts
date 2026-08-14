import { Graphics } from '@pixi/graphics';
import { AbsProperty } from './AbsProperty';
import { FillPropertyValue, ShapeTypeEnum } from '../contract';
import { BaseShape } from '../BaseShape';
import { getHatchTexture } from './hatch';
import {
	drawSketchyFillCircle,
	drawSketchyFillDiamond,
	drawSketchyFillRect,
	drawSketchyFillRoundedRect,
} from './style';
import { getDiamondPoints, getRoundedRectRadius } from '../geometry';
import { SHAPE_COLORS } from '@/common/color';

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

		if (this.shape.type === ShapeTypeEnum.RoundedRectangle) {
			const radius = getRoundedRectRadius(width, height);
			if (style === 'sketchy' && this.value.seed != null) {
				drawSketchyFillRoundedRect(
					g,
					0,
					0,
					width,
					height,
					radius,
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
			g.drawRoundedRect(0, 0, width, height, radius);
			g.endFill();
		}

		if (this.shape.type === ShapeTypeEnum.Diamond) {
			if (style === 'sketchy' && this.value.seed != null) {
				drawSketchyFillDiamond(
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
			g.drawPolygon(getDiamondPoints(width, height).flatMap(({ x, y }) => [x, y]));
			g.endFill();
		}
	}
}
