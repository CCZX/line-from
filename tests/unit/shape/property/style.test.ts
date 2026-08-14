import { describe, expect, it } from 'vitest';
import type { Graphics } from '@pixi/graphics';
import {
	drawSketchyCircle,
	drawSketchyDiamond,
	drawSketchyRoundedRect,
} from '@/shape/property/style';

class RecordingGraphics {
	public points: Point[] = [];

	public moveTo(x: number, y: number): this {
		this.points.push({ x, y });
		return this;
	}

	public lineTo(x: number, y: number): this {
		this.points.push({ x, y });
		return this;
	}

	public bezierCurveTo(
		_c1x: number,
		_c1y: number,
		_c2x: number,
		_c2y: number,
		x: number,
		y: number,
	): this {
		this.points.push({ x, y });
		return this;
	}

	public quadraticCurveTo(_cx: number, _cy: number, x: number, y: number): this {
		this.points.push({ x, y });
		return this;
	}
}

describe('drawSketchyCircle', () => {
	it('保留手绘抖动时不随机拉伸圆的横纵半径', () => {
		const graphics = new RecordingGraphics();

		drawSketchyCircle(graphics as unknown as Graphics, 0, 0, 200, 5);

		const xs = graphics.points.map(({ x }) => x);
		const ys = graphics.points.map(({ y }) => y);
		const width = Math.max(...xs) - Math.min(...xs);
		const height = Math.max(...ys) - Math.min(...ys);
		const aspectRatio = Math.max(width, height) / Math.min(width, height);

		expect(aspectRatio).toBeLessThan(1.02);
	});
});

describe('new shape sketch styles', () => {
	it('生成圆角矩形手绘路径', () => {
		const graphics = new RecordingGraphics();

		drawSketchyRoundedRect(graphics as unknown as Graphics, 0, 0, 120, 80, 16, 7);

		expect(graphics.points.length).toBeGreaterThan(8);
	});

	it('生成菱形手绘路径', () => {
		const graphics = new RecordingGraphics();

		drawSketchyDiamond(graphics as unknown as Graphics, 0, 0, 120, 80, 11);

		expect(graphics.points.length).toBeGreaterThan(4);
	});
});
