import { Point } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE, Viewport } from '@/canvas/core/Viewport';

function createViewport(): Viewport {
	const canvas = {
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 800 })),
	};

	return new Viewport(canvas as unknown as HTMLCanvasElement);
}

describe('Viewport zoom', () => {
	it('按预设档位缩放，并保持画布中心对应的世界坐标不变', () => {
		const viewport = createViewport();
		const center = new Point(500, 400);
		const worldBefore = viewport.toLocal(center);

		viewport.zoomIn();

		expect(viewport.scale.x).toBe(1.25);
		expect(viewport.toLocal(center).x).toBeCloseTo(worldBefore.x);
		expect(viewport.toLocal(center).y).toBeCloseTo(worldBefore.y);

		viewport.zoomOut();
		expect(viewport.scale.x).toBe(1);
		expect(viewport.toLocal(center).x).toBeCloseTo(worldBefore.x);
		expect(viewport.toLocal(center).y).toBeCloseTo(worldBefore.y);
	});

	it('单轴产生位移时也会正确补偿缩放中心', () => {
		const viewport = createViewport();
		const focalPoint = new Point(0, 400);
		const worldBefore = viewport.toLocal(focalPoint);

		viewport.setScale(2, focalPoint);

		expect(viewport.x).toBe(0);
		expect(viewport.y).not.toBe(0);
		expect(viewport.toLocal(focalPoint).x).toBeCloseTo(worldBefore.x);
		expect(viewport.toLocal(focalPoint).y).toBeCloseTo(worldBefore.y);
	});

	it('缩放比例限制在最小和最大值内', () => {
		const viewport = createViewport();

		viewport.setScale(0);
		expect(viewport.scale.x).toBe(MIN_ZOOM_SCALE);

		viewport.setScale(10);
		expect(viewport.scale.x).toBe(MAX_ZOOM_SCALE);
	});
});
