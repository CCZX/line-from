import { Point as PixiPoint } from 'pixi.js';
import { Stage } from '@/canvas/core/Stage';
import { IViewportService, ViewportState } from '@/domain/contract/ViewportService';
import { provide } from 'inversify-binding-decorators';
import { create } from 'zustand';
import { provideMultiple } from '@/common/context';
import { IDestroyable } from '@/common/contract/Destroyable';
import { Subscription } from 'rxjs';

const viewportStore = create<ViewportState>((set) => ({
	x: 0,
	y: 0,
	scale: 1,

	setX(x) {
		set(() => ({ x }));
	},
	setY(y) {
		set(() => ({ y }));
	},
	setScale(scale) {
		set(() => ({ scale }));
	},
}));

@provideMultiple(IViewportService, IDestroyable)
export class ViewportService implements IViewportService, IDestroyable {
	private stage!: Stage;
	private viewportSubscriptions: Subscription[] = [];

	public store = viewportStore;

	private listenViewportEvent() {
		const viewport = this.stage.getViewport();
		this.viewportSubscriptions.push(
			viewport.scaleChangeEvent$.subscribe(({ scale }) => {
				this.store.getState().setScale(scale);
			}),
			viewport.positionChangeEvent$.subscribe(({ x, y }) => {
				this.store.getState().setX(x);
				this.store.getState().setY(y);
			}),
		);
	}

	public setStage(stage: Stage) {
		this.clearViewportSubscriptions();
		this.stage = stage;
		this.listenViewportEvent();
	}

	public getStage() {
		return this.stage;
	}

	public zoomIn(): void {
		this.stage.getViewport().zoomIn();
	}

	public zoomOut(): void {
		this.stage.getViewport().zoomOut();
	}

	public resetZoom(): void {
		this.stage.getViewport().resetZoom();
	}

	public clientToViewportLocal(clientX: number, clientY: number): PixiPoint {
		const viewport = this.stage.getViewport();
		const canvasRect = viewport.canvasEl.getBoundingClientRect();
		const stageX = clientX - canvasRect.left;
		const stageY = clientY - canvasRect.top;
		return viewport.toLocal(new PixiPoint(stageX, stageY));
	}

	public destroy(): void {
		this.clearViewportSubscriptions();
	}

	private clearViewportSubscriptions(): void {
		this.viewportSubscriptions.forEach((subscription) => subscription.unsubscribe());
		this.viewportSubscriptions = [];
	}
}
