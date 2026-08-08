import { Application, Container, Graphics } from 'pixi.js';
import { Viewport } from './Viewport';
import { CANVAS_COLORS, colorToHex } from '@/common/color';

export class Stage {
	private app: Application;
	private viewport: Viewport;
	private el: HTMLDivElement;

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
		this.el.removeChild(this.app.view as unknown as HTMLCanvasElement);
		this.app.destroy();
		this.viewport.destroy();
	}
}
