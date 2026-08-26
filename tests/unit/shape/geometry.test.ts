import { describe, expect, it } from 'vitest';
import {
	getDiamondPoints,
	getNearestAnchorPoint,
	getNearestShapeAnchor,
	getRoundedRectRadius,
	isPointInDiamond,
	isPointInRoundedRect,
} from '@/shape/geometry';
import type { BaseShape } from '@/shape/BaseShape';
import { ShapePropertyEnum } from '@/shape/contract';

describe('shape geometry', () => {
	it('生成菱形四个方向的顶点', () => {
		expect(getDiamondPoints(120, 80)).toEqual([
			{ x: 60, y: 0 },
			{ x: 120, y: 40 },
			{ x: 60, y: 80 },
			{ x: 0, y: 40 },
		]);
	});

	it('菱形只命中实际轮廓内部', () => {
		expect(isPointInDiamond({ x: 50, y: 40 }, 100, 80)).toBe(true);
		expect(isPointInDiamond({ x: 10, y: 10 }, 100, 80)).toBe(false);
		expect(isPointInDiamond({ x: 50, y: 0 }, 100, 80)).toBe(true);
	});

	it('圆角矩形排除圆角外部并限制小尺寸圆角半径', () => {
		expect(getRoundedRectRadius(100, 80)).toBe(16);
		expect(getRoundedRectRadius(20, 12)).toBe(3);
		expect(isPointInRoundedRect({ x: 0, y: 0 }, 100, 80, 16)).toBe(false);
		expect(isPointInRoundedRect({ x: 8, y: 8 }, 100, 80, 16)).toBe(true);
		expect(isPointInRoundedRect({ x: 50, y: 40 }, 100, 80, 16)).toBe(true);
	});

	it('根据当前端点位置选择最近的图形边', () => {
		const base = { x: 100, y: 200, width: 120, height: 80 };

		expect(getNearestAnchorPoint(base, { x: 230, y: 240 })).toEqual({
			anchor: 'right',
			point: { x: 220, y: 240 },
		});
		expect(getNearestAnchorPoint(base, { x: 160, y: 290 })).toEqual({
			anchor: 'bottom',
			point: { x: 160, y: 280 },
		});
	});

	it('旋转图形按自身方向选择离当前端点最近的边', () => {
		const base = { x: 0, y: 0, width: 100, height: 60, rotation: 90 };
		const shape = {
			getProperty: (type: ShapePropertyEnum) => {
				expect(type).toBe(ShapePropertyEnum.Base);
				return { get: () => base };
			},
		} as unknown as BaseShape;

		const nearest = getNearestShapeAnchor(shape, { x: 90, y: 30 });

		expect(nearest.anchor).toBe('top');
		expect(nearest.point.x).toBeCloseTo(80);
		expect(nearest.point.y).toBeCloseTo(30);
	});
});
