import { describe, expect, it, vi } from 'vitest';
import { BaseShape } from '@/shape/BaseShape';
import { Line } from '@/shape/Line';
import { ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { getShapeWorldBounds } from '@/domain/service/ShapeManager';

describe('getShapeWorldBounds', () => {
	it('计算旋转图形的世界坐标 AABB', () => {
		const shape = {
			type: ShapeTypeEnum.Rectangle,
			container: { x: 100, y: 200, angle: 90 },
			getBounds: vi.fn(() => ({ x: 0, y: 0, width: 80, height: 40 })),
			getWorldBounds: BaseShape.prototype.getWorldBounds,
		} as unknown as BaseShape;

		const bounds = getShapeWorldBounds(shape);

		expect(bounds.x).toBeCloseTo(80);
		expect(bounds.y).toBeCloseTo(160);
		expect(bounds.width).toBeCloseTo(40);
		expect(bounds.height).toBeCloseTo(80);
	});

	it('连线包围盒包含命中检测容差', () => {
		const lineProperty = {
			getPoints: vi.fn(() => [
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
		};
		const strokeProperty = { value: { width: 2 } };
		const shape = {
			type: ShapeTypeEnum.Line,
			getWorldBounds: Line.prototype.getWorldBounds,
			getProperty: vi.fn((type: ShapePropertyEnum) => {
				if (type === ShapePropertyEnum.Line) {
					return lineProperty;
				}
				if (type === ShapePropertyEnum.Stroke) {
					return strokeProperty;
				}
			}),
		} as unknown as BaseShape;

		expect(getShapeWorldBounds(shape)).toEqual({ x: -6, y: -6, width: 112, height: 12 });
	});
});
