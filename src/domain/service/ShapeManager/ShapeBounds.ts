import { BaseShape } from '@/shape/BaseShape';
import { sampleCurvePoints } from '@/shape/geometry';
import { ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { LineProperty } from '@/shape/property/LineProperty';
import { StrokeProperty } from '@/shape/property/StrokeProperty';

const MIN_LINE_HIT_DISTANCE = 6;

/** 计算图形在 viewport 世界坐标系中的轴对齐包围盒。 */
export function getShapeWorldBounds(shape: BaseShape): Rectangle {
	if (shape.type === ShapeTypeEnum.Line) {
		return getLineWorldBounds(shape);
	}

	const { width, height } = shape.getBounds();
	const centerX = shape.container.x;
	const centerY = shape.container.y;
	const radians = (shape.container.angle * Math.PI) / 180;
	const absCos = Math.abs(Math.cos(radians));
	const absSin = Math.abs(Math.sin(radians));
	const worldWidth = width * absCos + height * absSin;
	const worldHeight = width * absSin + height * absCos;

	return {
		x: centerX - worldWidth / 2,
		y: centerY - worldHeight / 2,
		width: worldWidth,
		height: worldHeight,
	};
}

/** 计算多个图形世界坐标 AABB 的并集。 */
export function getShapesWorldBounds(shapes: BaseShape[]): Rectangle | null {
	if (shapes.length === 0) {
		return null;
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const shape of shapes) {
		const bounds = getShapeWorldBounds(shape);
		minX = Math.min(minX, bounds.x);
		minY = Math.min(minY, bounds.y);
		maxX = Math.max(maxX, bounds.x + bounds.width);
		maxY = Math.max(maxY, bounds.y + bounds.height);
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

function getLineWorldBounds(shape: BaseShape): Rectangle {
	const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
	if (!line) {
		return getFallbackLineBounds(shape);
	}

	const points = sampleCurvePoints(line.getPoints());
	if (points.length === 0) {
		return getFallbackLineBounds(shape);
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
		shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke)?.value?.width ?? 1;
	const padding = Math.max(strokeWidth / 2 + 4, MIN_LINE_HIT_DISTANCE);

	return {
		x: minX - padding,
		y: minY - padding,
		width: maxX - minX + padding * 2,
		height: maxY - minY + padding * 2,
	};
}

function getFallbackLineBounds(shape: BaseShape): Rectangle {
	const { width, height } = shape.getBounds();
	return {
		x: shape.container.x - width / 2 - MIN_LINE_HIT_DISTANCE,
		y: shape.container.y - height / 2 - MIN_LINE_HIT_DISTANCE,
		width: width + MIN_LINE_HIT_DISTANCE * 2,
		height: height + MIN_LINE_HIT_DISTANCE * 2,
	};
}
