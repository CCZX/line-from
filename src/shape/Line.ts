import { Graphics } from '@pixi/graphics';
import { ShapeContext, ShapeDecorateTypeEnum, ShapePropertyEnum, ShapeTypeEnum } from './contract';
import { BaseShape } from './BaseShape';
import { LineProperty } from './property/LineProperty';
import { StrokeProperty } from './property/StrokeProperty';
import { HoverBorder } from './decorate/HoverBorder';
import { LineSelectedBorder } from './decorate/LineSelectedBorder';
import type { DecorateViewport } from './decorate/AbsDecorate';
import { distToSegment, sampleCurvePoints } from './geometry';

const MIN_HIT_DISTANCE = 6;

export class Line extends BaseShape<Graphics> {
	public get type(): ShapeTypeEnum {
		return ShapeTypeEnum.Line;
	}

	constructor(id: string, context: ShapeContext) {
		super(id, new Graphics(), context);
	}

	protected initProperty() {
		super.initProperty();
		this.propertyMap.set(ShapePropertyEnum.Line, new LineProperty(this));
	}

	protected initDecorate(viewport: DecorateViewport) {
		this.decorateMap.set(ShapeDecorateTypeEnum.HoverBorder, new HoverBorder(this, viewport));
		this.decorateMap.set(
			ShapeDecorateTypeEnum.SelectedBorder,
			new LineSelectedBorder(this, viewport),
		);
	}

	/** 线的包围盒可能高/宽为 0，改用点到路径距离判断命中 */
	public containsPoint(localPoint: Point): boolean {
		const line = this.getProperty<LineProperty>(ShapePropertyEnum.Line);
		if (!line) {
			return false;
		}

		const strokeWidth =
			this.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke)?.value?.width ?? 1;
		const threshold = Math.max(strokeWidth / 2 + 4, MIN_HIT_DISTANCE);

		const samples = sampleCurvePoints(line.getLocalPoints());
		for (let i = 0; i < samples.length - 1; i++) {
			if (distToSegment(localPoint, samples[i], samples[i + 1]) < threshold) {
				return true;
			}
		}
		return false;
	}
}
