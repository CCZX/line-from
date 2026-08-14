import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage } from '@/canvas/core/Stage';

const mocks = vi.hoisted(() => ({
	addChild: vi.fn(),
	appDestroy: vi.fn(),
	appOptions: vi.fn(),
	canvas: {},
	disconnect: vi.fn(),
	observe: vi.fn(),
	rendererResize: vi.fn(),
	resizeCallback: null as ResizeObserverCallback | null,
	viewportDestroy: vi.fn(),
}));

vi.mock('@pixi/app', () => ({
	Application: class {
		public view = mocks.canvas;
		public stage = { addChild: mocks.addChild };
		public renderer = { resize: mocks.rendererResize };

		constructor(options: unknown) {
			mocks.appOptions(options);
		}

		public destroy(): void {
			mocks.appDestroy();
		}
	},
}));

vi.mock('@/canvas/core/Viewport', () => ({
	Viewport: class {
		public addChild = vi.fn();

		public destroy(): void {
			mocks.viewportDestroy();
		}
	},
}));

function createElement(width = 800, height = 600) {
	return {
		appendChild: vi.fn(),
		getBoundingClientRect: vi.fn(() => ({ width, height })),
		removeChild: vi.fn(),
	};
}

function notifyResize(width: number, height: number): void {
	mocks.resizeCallback?.(
		[{ contentRect: { width, height } } as ResizeObserverEntry],
		{} as ResizeObserver,
	);
}

describe('Stage', () => {
	beforeEach(() => {
		mocks.resizeCallback = null;
		vi.useFakeTimers();
		vi.stubGlobal('window', { devicePixelRatio: 2 });
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: ResizeObserverCallback) {
					mocks.resizeCallback = callback;
				}

				public observe = mocks.observe;
				public disconnect = mocks.disconnect;
			},
		);
	});

	it('容器尺寸变化时同步更新 Pixi 渲染器尺寸', () => {
		const element = createElement();

		new Stage(element as unknown as HTMLDivElement);

		expect(mocks.appOptions).toHaveBeenCalledWith(
			expect.objectContaining({ width: 800, height: 600, resolution: 2 }),
		);
		expect(mocks.observe).toHaveBeenCalledWith(element);

		notifyResize(640, 480);
		expect(mocks.rendererResize).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);

		expect(mocks.rendererResize).toHaveBeenCalledWith(640, 480);
	});

	it('连续尺寸变化时只使用最后一次尺寸更新渲染器', () => {
		const element = createElement();

		new Stage(element as unknown as HTMLDivElement);

		notifyResize(700, 500);
		vi.advanceTimersByTime(50);
		notifyResize(600, 400);
		vi.advanceTimersByTime(99);

		expect(mocks.rendererResize).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);

		expect(mocks.rendererResize).toHaveBeenCalledOnce();
		expect(mocks.rendererResize).toHaveBeenCalledWith(600, 400);
	});

	it('忽略不可见容器的零尺寸，并在销毁时停止监听和取消待执行更新', () => {
		const element = createElement();
		const stage = new Stage(element as unknown as HTMLDivElement);

		notifyResize(0, 0);
		expect(mocks.rendererResize).not.toHaveBeenCalled();
		notifyResize(640, 480);

		stage.destroy();
		vi.advanceTimersByTime(100);

		expect(mocks.disconnect).toHaveBeenCalledOnce();
		expect(mocks.rendererResize).not.toHaveBeenCalled();
		expect(element.removeChild).toHaveBeenCalledWith(mocks.canvas);
	});
});
