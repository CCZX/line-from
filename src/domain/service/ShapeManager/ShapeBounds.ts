import { BaseShape } from '@lineform/shape/BaseShape';

/** 计算图形在 viewport 世界坐标系中的轴对齐包围盒。 */
export function getShapeWorldBounds(shape: BaseShape): Rectangle {
	return shape.getWorldBounds();
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
