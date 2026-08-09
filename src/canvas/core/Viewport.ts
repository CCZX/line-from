import { Point } from '@pixi/core';
import { Container, type IDestroyOptions } from '@pixi/display';
import { Subject } from 'rxjs';

export const ZOOM_SCALE_LIST = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export const MIN_ZOOM_SCALE = ZOOM_SCALE_LIST[0];
export const MAX_ZOOM_SCALE = ZOOM_SCALE_LIST[ZOOM_SCALE_LIST.length - 1];

function floorToTwoDecimals(value: number): number {
	return Math.floor(value * 100) / 100;
}

/**
 *
 * @param scale
 * @returns
 */
export function formatZoomScale(scale: number) {
	if (scale < MIN_ZOOM_SCALE) {
		scale = MIN_ZOOM_SCALE;
	}

	if (scale > MAX_ZOOM_SCALE) {
		scale = MAX_ZOOM_SCALE;
	}

	return floorToTwoDecimals(scale);
}

/**
 * 视口，所有节点的父级
 */
export class Viewport extends Container {
	private canvas: HTMLCanvasElement;
	private isSpacePressed = false;
	private activePanPointerId: number | null = null;
	private lastPanPoint: Point | null = null;
	private previousCanvasCursor: string | null = null;

	public scaleChangeEvent$ = new Subject<{ scale: number }>();

	public positionChangeEvent$ = new Subject<{ x: number; y: number }>();

	public get canvasEl(): HTMLCanvasElement {
		return this.canvas;
	}

	constructor(canvas: HTMLCanvasElement) {
		super();

		this.canvas = canvas;

		this.initEvent();
	}

	private onWheel = (e: WheelEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const { ctrlKey, shiftKey, deltaX, deltaY, offsetX, offsetY } = e;

		if (ctrlKey) {
			const scale = this.scale.x - deltaY / 50; // ➗ 50 防止缩放速度过快
			this.setScale(scale, new Point(offsetX, offsetY));
			return;
		}

		if (shiftKey) {
			// 鼠标滚轮通常只产生 deltaY，Shift 时将它转换为水平位移。
			// 触控板可能已经提供 deltaX，此时优先使用原始水平位移。
			const horizontalDelta = deltaX || deltaY;
			this.setPosition(this.x - horizontalDelta, this.y);
			return;
		}

		this.setPosition(this.x - deltaX, this.y - deltaY);
	};

	private onKeyDown = (e: KeyboardEvent) => {
		if (e.code !== 'Space' || this.isEditableTarget(e.target)) {
			return;
		}

		e.preventDefault();
		if (this.isSpacePressed) {
			return;
		}

		this.isSpacePressed = true;
		this.previousCanvasCursor = this.canvas.style.cursor;
		this.canvas.style.cursor = 'grab';
	};

	private onKeyUp = (e: KeyboardEvent) => {
		if (e.code !== 'Space' || !this.isSpacePressed) {
			return;
		}

		e.preventDefault();
		this.isSpacePressed = false;
		this.handleDragMoveEnd();
		this.restoreCanvasCursor();
	};

	private onPointerDown = (e: PointerEvent) => {
		if (!this.isSpacePressed || e.button !== 0 || this.activePanPointerId !== null) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		this.activePanPointerId = e.pointerId;
		this.lastPanPoint = new Point(e.clientX, e.clientY);
		this.canvas.setPointerCapture?.(e.pointerId);
		this.canvas.style.cursor = 'grabbing';
	};

	private onPointerMove = (e: PointerEvent) => {
		if (e.pointerId !== this.activePanPointerId || !this.lastPanPoint) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		const deltaX = e.clientX - this.lastPanPoint.x;
		const deltaY = e.clientY - this.lastPanPoint.y;
		this.lastPanPoint.set(e.clientX, e.clientY);
		this.setPosition(this.x + deltaX, this.y + deltaY);
	};

	private onPointerUp = (e: PointerEvent) => {
		if (e.pointerId !== this.activePanPointerId) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		this.handleDragMoveEnd();
	};

	private onWindowBlur = () => {
		if (!this.isSpacePressed && this.activePanPointerId === null) {
			return;
		}

		this.isSpacePressed = false;
		this.handleDragMoveEnd();
		this.restoreCanvasCursor();
	};

	private isEditableTarget(target: EventTarget | null): boolean {
		const element = target as HTMLElement | null;
		return Boolean(
			element &&
				(element.tagName === 'INPUT' ||
					element.tagName === 'TEXTAREA' ||
					element.tagName === 'SELECT' ||
					element.isContentEditable),
		);
	}

	private handleDragMoveEnd(): void {
		if (this.activePanPointerId !== null) {
			const canRelease =
				!this.canvas.hasPointerCapture || this.canvas.hasPointerCapture(this.activePanPointerId);
			if (canRelease) {
				this.canvas.releasePointerCapture?.(this.activePanPointerId);
			}
		}

		this.activePanPointerId = null;
		this.lastPanPoint = null;
		if (this.isSpacePressed) {
			this.canvas.style.cursor = 'grab';
		}
	}

	private restoreCanvasCursor(): void {
		if (this.previousCanvasCursor === null) {
			return;
		}

		this.canvas.style.cursor = this.previousCanvasCursor;
		this.previousCanvasCursor = null;
	}

	private initEvent() {
		this.canvas.addEventListener('wheel', this.onWheel);
		this.canvas.addEventListener('pointerdown', this.onPointerDown);
		this.canvas.addEventListener('pointermove', this.onPointerMove);
		this.canvas.addEventListener('pointerup', this.onPointerUp);
		this.canvas.addEventListener('pointercancel', this.onPointerUp);
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', this.onKeyDown);
			window.addEventListener('keyup', this.onKeyUp);
			window.addEventListener('blur', this.onWindowBlur);
		}
	}

	public setScale(scale: number, point?: Point) {
		scale = formatZoomScale(scale);
		if (scale === this.scale.x) {
			return;
		}

		const { width, height } = this.canvas.getBoundingClientRect();
		point = point || new Point(width / 2, height / 2);

		const prevPoint = this.toLocal(point);

		this.scale.set(scale, scale);

		const nextPoint = this.toLocal(point);

		const offsetX = (prevPoint.x - nextPoint.x) * scale;
		const offsetY = (prevPoint.y - nextPoint.y) * scale;

		if (offsetX !== 0 || offsetY !== 0) {
			this.setPosition(this.x - offsetX, this.y - offsetY);
		}

		this.scaleChangeEvent$.next({ scale });
	}

	public zoomIn(point?: Point): void {
		const nextScale = ZOOM_SCALE_LIST.find((scale) => scale > this.scale.x + 0.001);
		this.setScale(nextScale ?? MAX_ZOOM_SCALE, point);
	}

	public zoomOut(point?: Point): void {
		const nextScale = [...ZOOM_SCALE_LIST].reverse().find((scale) => scale < this.scale.x - 0.001);
		this.setScale(nextScale ?? MIN_ZOOM_SCALE, point);
	}

	public resetZoom(point?: Point): void {
		this.setScale(1, point);
	}

	private setPosition(x: number, y: number) {
		x = floorToTwoDecimals(x);
		y = floorToTwoDecimals(y);

		this.position.set(x, y);
		this.positionChangeEvent$.next({ x, y });
	}

	public destroy(options?: boolean | IDestroyOptions | undefined): void {
		this.canvas.removeEventListener('wheel', this.onWheel);
		this.canvas.removeEventListener('pointerdown', this.onPointerDown);
		this.canvas.removeEventListener('pointermove', this.onPointerMove);
		this.canvas.removeEventListener('pointerup', this.onPointerUp);
		this.canvas.removeEventListener('pointercancel', this.onPointerUp);
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', this.onKeyDown);
			window.removeEventListener('keyup', this.onKeyUp);
			window.removeEventListener('blur', this.onWindowBlur);
		}
		this.isSpacePressed = false;
		this.handleDragMoveEnd();
		this.restoreCanvasCursor();

		super.destroy(options);
	}
}
