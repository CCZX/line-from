import { describe, expect, it } from 'vitest';
import {
	getDiamondPoints,
	getRoundedRectRadius,
	isPointInDiamond,
	isPointInRoundedRect,
} from '@/shape/geometry';

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
});
