import { Application } from '@pixi/app';
import { Container } from '@pixi/display';
import { Graphics } from '@pixi/graphics';
import debounce from 'lodash/debounce';
import { Viewport } from './Viewport';
import { CANVAS_COLORS, colorToHex } from '@lineform/common/color';

const RESIZE_DEBOUNCE_MS = 100;

export class Stage {
	private app: Application;
	private viewport: Viewport;
	private el: HTMLDivElement;
	private resizeObserver: ResizeObserver;
	private resizeRenderer = debounce((width: number, height: number) => {
		this.app.renderer.resize(width, height);
	}, RESIZE_DEBOUNCE_MS);

	constructor(el: HTMLDivElement) {
		this.el = el;

		const { width, height } = el.getBoundingClientRect();

		const app = new Application({
			width: width,
			height: height,
			autoDensity: true,
			antialias: true,
			resolution: window.devicePixelRatio,
			backgroundColor: colorToHex(CANVAS_COLORS.background),
			preserveDrawingBuffer: true,
		});

		this.app = app;

		el.appendChild(app.view as unknown as HTMLCanvasElement);

		this.viewport = new Viewport(app.view as unknown as HTMLCanvasElement);

		app.stage.addChild(this.viewport);

		this.resizeObserver = new ResizeObserver(([entry]) => {
			if (!entry) {
				return;
			}

			const { width, height } = entry.contentRect;
			if (width > 0 && height > 0) {
				this.resizeRenderer(width, height);
			} else {
				this.resizeRenderer.cancel();
			}
		});
		this.resizeObserver.observe(el);

		// for debug
		(globalThis as any).__PIXI_APP__ = app;
	}

	public static createStage(el: HTMLDivElement) {
		return new Stage(el);
	}

	public appendShape(shape: Container) {
		this.viewport.addChild(shape);
	}

	public removeShape(shape: Container) {
		this.viewport.removeChild(shape);
	}

	public getViewport() {
		return this.viewport;
	}

	public destroy() {
		this.resizeObserver.disconnect();
		this.resizeRenderer.cancel();
		this.el.removeChild(this.app.view as unknown as HTMLCanvasElement);
		this.app.destroy();
		this.viewport.destroy();
	}
}
