import { Point } from '@pixi/core';
import { describe, expect, it, vi } from 'vitest';
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE, Viewport } from '@/canvas/core/Viewport';

interface CanvasMock {
	style: { cursor: string };
	addEventListener: ReturnType<typeof vi.fn>;
	removeEventListener: ReturnType<typeof vi.fn>;
	getBoundingClientRect: ReturnType<typeof vi.fn>;
	setPointerCapture: ReturnType<typeof vi.fn>;
	hasPointerCapture: ReturnType<typeof vi.fn>;
	releasePointerCapture: ReturnType<typeof vi.fn>;
}

function createCanvas(): CanvasMock {
	return {
		style: { cursor: '' },
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		getBoundingClientRect: vi.fn(() => ({ width: 1000, height: 800 })),
		setPointerCapture: vi.fn(),
		hasPointerCapture: vi.fn(() => true),
		releasePointerCapture: vi.fn(),
	};
}

function createViewport(canvas = createCanvas()): Viewport {
	return new Viewport(canvas as unknown as HTMLCanvasElement);
}

function callWheelHandler(viewport: Viewport, event: WheelEvent): void {
	(viewport as unknown as { onWheel: (event: WheelEvent) => void }).onWheel(event);
}

function callViewportHandler<
	T extends 'onKeyDown' | 'onKeyUp' | 'onPointerDown' | 'onPointerMove' | 'onPointerUp',
>(
	viewport: Viewport,
	handler: T,
	event: T extends 'onKeyDown' | 'onKeyUp' ? KeyboardEvent : PointerEvent,
): void {
	(
		viewport as unknown as Record<
			T,
			(event: T extends 'onKeyDown' | 'onKeyUp' ? KeyboardEvent : PointerEvent) => void
		>
	)[handler](event);
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

	it('缩放全览时完整容纳内容并居中', () => {
		const viewport = createViewport();
		const scaleChanges: number[] = [];
		const positionChanges: Array<{ x: number; y: number }> = [];
		viewport.scaleChangeEvent$.subscribe(({ scale }) => scaleChanges.push(scale));
		viewport.positionChangeEvent$.subscribe((position) => positionChanges.push(position));

		viewport.zoomToFit({ x: 100, y: 200, width: 400, height: 200 }, 50);

		expect(viewport.scale.x).toBe(2.25);
		expect({ x: viewport.x, y: viewport.y }).toEqual({ x: -175, y: -275 });
		expect(scaleChanges).toEqual([2.25]);
		expect(positionChanges).toEqual([{ x: -175, y: -275 }]);
	});

	it('缩放全览遵守缩放上下限，并支持零尺寸内容', () => {
		const viewport = createViewport();

		viewport.zoomToFit({ x: 100, y: 200, width: 10, height: 10 });
		expect(viewport.scale.x).toBe(MAX_ZOOM_SCALE);
		expect(viewport.toLocal(new Point(500, 400))).toMatchObject({ x: 105, y: 205 });

		viewport.zoomToFit({ x: -5000, y: -4000, width: 10000, height: 8000 });
		expect(viewport.scale.x).toBe(MIN_ZOOM_SCALE);

		viewport.zoomToFit({ x: 20, y: 30, width: 0, height: 0 });
		expect(viewport.scale.x).toBe(MAX_ZOOM_SCALE);
		expect(viewport.toLocal(new Point(500, 400))).toMatchObject({ x: 20, y: 30 });
	});
});

describe('Viewport pan', () => {
	it('普通滚轮竖向平移，Shift + 滚轮水平平移', () => {
		const viewport = createViewport();
		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();

		callWheelHandler(viewport, {
			ctrlKey: false,
			shiftKey: false,
			deltaX: 0,
			deltaY: 20,
			preventDefault,
			stopPropagation,
		} as unknown as WheelEvent);
		expect({ x: viewport.x, y: viewport.y }).toEqual({ x: 0, y: -20 });

		callWheelHandler(viewport, {
			ctrlKey: false,
			shiftKey: true,
			deltaX: 0,
			deltaY: 30,
			preventDefault,
			stopPropagation,
		} as unknown as WheelEvent);
		expect({ x: viewport.x, y: viewport.y }).toEqual({ x: -30, y: -20 });
		expect(preventDefault).toHaveBeenCalledTimes(2);
		expect(stopPropagation).toHaveBeenCalledTimes(2);
	});

	it('按住空格拖拽时按屏幕位移平移画布', () => {
		const canvas = createCanvas();
		canvas.style.cursor = 'crosshair';
		const viewport = createViewport(canvas);
		const positionChanges: Array<{ x: number; y: number }> = [];
		viewport.positionChangeEvent$.subscribe((position) => positionChanges.push(position));
		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();

		callViewportHandler(viewport, 'onKeyDown', {
			code: 'Space',
			target: null,
			preventDefault,
		} as unknown as KeyboardEvent);
		expect(canvas.style.cursor).toBe('grab');

		callViewportHandler(viewport, 'onPointerDown', {
			button: 0,
			pointerId: 7,
			clientX: 100,
			clientY: 80,
			preventDefault,
			stopPropagation,
		} as unknown as PointerEvent);
		expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
		expect(canvas.style.cursor).toBe('grabbing');

		callViewportHandler(viewport, 'onPointerMove', {
			pointerId: 7,
			clientX: 130,
			clientY: 60,
			preventDefault,
			stopPropagation,
		} as unknown as PointerEvent);
		expect({ x: viewport.x, y: viewport.y }).toEqual({ x: 30, y: -20 });
		expect(positionChanges).toEqual([{ x: 30, y: -20 }]);

		callViewportHandler(viewport, 'onPointerUp', {
			pointerId: 7,
			preventDefault,
			stopPropagation,
		} as unknown as PointerEvent);
		expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7);
		expect(canvas.style.cursor).toBe('grab');

		callViewportHandler(viewport, 'onKeyUp', {
			code: 'Space',
			preventDefault,
		} as unknown as KeyboardEvent);
		expect(canvas.style.cursor).toBe('crosshair');
	});

	it('在可编辑元素中按空格时不进入画布平移状态', () => {
		const canvas = createCanvas();
		const viewport = createViewport(canvas);
		const preventDefault = vi.fn();

		callViewportHandler(viewport, 'onKeyDown', {
			code: 'Space',
			target: { tagName: 'TEXTAREA', isContentEditable: false },
			preventDefault,
		} as unknown as KeyboardEvent);
		callViewportHandler(viewport, 'onPointerDown', {
			button: 0,
			pointerId: 1,
			clientX: 0,
			clientY: 0,
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		} as unknown as PointerEvent);

		expect(preventDefault).not.toHaveBeenCalled();
		expect(canvas.setPointerCapture).not.toHaveBeenCalled();
		expect(canvas.style.cursor).toBe('');
	});
});
