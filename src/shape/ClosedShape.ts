import { Graphics } from '@pixi/graphics';
import { ShapePropertyEnum, type FillPropertyValue, type StrokePropertyValue } from './contract';
import { TextEditableShape } from './TextEditableShape';
import { BaseProperty } from './property/BaseProperty';
import { FillProperty } from './property/FillProperty';
import { StrokeProperty } from './property/StrokeProperty';
import { getHatchTexture } from './property/hatch';
import { applyLineStyle } from './property/style';

/**
 * 有封闭轮廓的图形共享填充、描边和文字渲染流程。
 * 具体几何路径及手绘实现由各图形类自行提供。
 */
export abstract class ClosedShape extends TextEditableShape<Graphics> {
	protected drawShape(): void {
		const base = this.getProperty<BaseProperty>(ShapePropertyEnum.Base);
		if (!base) {
			super.drawShape();
			return;
		}

		const { width, height } = base.get();
		const graphics = this.graphics;
		graphics.clear();
		this.prepareGraphics(width, height);

		// 保留完整透明几何，手绘填充的空隙也能正常命中。
		graphics.beginFill(0, 0);
		this.drawPath(graphics, width, height);
		graphics.endFill();

		const fill = this.getProperty<FillProperty>(ShapePropertyEnum.Fill)?.value;
		if (fill) {
			this.drawFill(graphics, width, height, fill);
		}

		const stroke = this.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke)?.value;
		if (stroke && stroke.width > 0) {
			this.drawStroke(graphics, width, height, stroke);
		}

		super.drawShape();
	}

	protected prepareGraphics(_width: number, _height: number): void {
		this.graphics.position.set(0, 0);
	}

	protected abstract drawPath(graphics: Graphics, width: number, height: number): void;

	protected abstract drawSketchyFill(
		graphics: Graphics,
		width: number,
		height: number,
		value: FillPropertyValue,
	): void;

	protected abstract drawSketchyStroke(
		graphics: Graphics,
		width: number,
		height: number,
		value: StrokePropertyValue,
	): void;

	private drawFill(
		graphics: Graphics,
		width: number,
		height: number,
		value: FillPropertyValue,
	): void {
		if ((value.style ?? 'solid') === 'sketchy' && value.seed != null) {
			this.drawSketchyFill(graphics, width, height, value);
			return;
		}

		if (value.style === 'hatch') {
			graphics.beginTextureFill({
				texture: getHatchTexture(),
				color: value.color,
				alpha: value.alpha,
			});
		} else {
			graphics.beginFill(value.color, value.alpha);
		}
		this.drawPath(graphics, width, height);
		graphics.endFill();
	}

	private drawStroke(
		graphics: Graphics,
		width: number,
		height: number,
		value: StrokePropertyValue,
	): void {
		applyLineStyle(graphics, {
			width: value.width,
			color: value.color,
			alpha: value.alpha,
		});

		if ((value.style ?? 'regular') === 'sketchy' && value.seed != null) {
			this.drawSketchyStroke(graphics, width, height, value);
		} else {
			this.drawPath(graphics, width, height);
		}
		graphics.lineStyle(0);
	}
}
