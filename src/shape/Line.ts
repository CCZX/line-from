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

	public get supportsBoxResize(): boolean {
		return false;
	}

	public get supportsRotation(): boolean {
		return false;
	}

	public get supportsAlignmentSnap(): boolean {
		return false;
	}

	public get acceptsConnections(): boolean {
		return false;
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

	protected drawShape(): void {
		this.getProperty<LineProperty>(ShapePropertyEnum.Line)?.draw();
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

	public getWorldBounds(): Rectangle {
		const line = this.getProperty<LineProperty>(ShapePropertyEnum.Line);
		if (!line) {
			return this.getFallbackWorldBounds();
		}

		const points = sampleCurvePoints(line.getPoints());
		if (points.length === 0) {
			return this.getFallbackWorldBounds();
		}

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const point of points) {
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		const strokeWidth =
			this.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke)?.value?.width ?? 1;
		const padding = Math.max(strokeWidth / 2 + 4, MIN_HIT_DISTANCE);

		return {
			x: minX - padding,
			y: minY - padding,
			width: maxX - minX + padding * 2,
			height: maxY - minY + padding * 2,
		};
	}

	private getFallbackWorldBounds(): Rectangle {
		const { width, height } = this.getBounds();
		return {
			x: this.container.x - width / 2 - MIN_HIT_DISTANCE,
			y: this.container.y - height / 2 - MIN_HIT_DISTANCE,
			width: width + MIN_HIT_DISTANCE * 2,
			height: height + MIN_HIT_DISTANCE * 2,
		};
	}
}
