import { describe, expect, it } from 'vitest';
import { BaseShape } from '@lineform/shape/BaseShape';
import { Circle } from '@lineform/shape/Circle';
import { Line } from '@lineform/shape/Line';
import { ResizeDirection, ShapeTypeEnum } from '@lineform/shape/contract';

describe('Shape 多态行为', () => {
	it('圆形自行约束缩放结果为正方形', () => {
		const circle = Object.create(Circle.prototype) as Circle;

		const result = circle.resolveResize({
			origin: { x: 10, y: 20, width: 100, height: 100 },
			proposed: { x: 10, y: 20, width: 140, height: 120 },
			direction: ResizeDirection.BR,
			deltaX: 40,
			deltaY: 20,
			minSize: 10,
		});

		expect(result).toEqual({ x: 10, y: 20, width: 140, height: 140 });
	});

	it('普通图形接受交互层计算出的缩放结果', () => {
		const proposed = { x: 5, y: 6, width: 70, height: 80 };
		const shape = Object.create(BaseShape.prototype) as BaseShape;

		expect(
			shape.resolveResize({
				origin: { x: 0, y: 0, width: 100, height: 100 },
				proposed,
				direction: ResizeDirection.TR,
				deltaX: -30,
				deltaY: 20,
				minSize: 10,
			}),
		).toBe(proposed);
	});

	it('直线通过能力声明退出包围盒交互', () => {
		const line = Object.create(Line.prototype) as Line;

		expect(line.type).toBe(ShapeTypeEnum.Line);
		expect(line.supportsBoxResize).toBe(false);
		expect(line.supportsRotation).toBe(false);
		expect(line.supportsAlignmentSnap).toBe(false);
		expect(line.acceptsConnections).toBe(false);
	});
});
