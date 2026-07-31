import { Point as PixiPoint } from 'pixi.js';
import { Stage } from '@/canvas/core/Stage';
import { IViewportService, ViewportState } from '@/domain/contract/ViewportService';
import { provide } from 'inversify-binding-decorators';
import { create } from 'zustand';
import { provideMultiple } from '@/common/context';
import { IDestroyable } from '@/common/contract/Destroyable';

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

	public store = viewportStore;

	private listenViewportEvent() {
		this.stage.getViewport()?.scaleChangeEvent$.subscribe((scale) => {
			this.store.getState().setScale(scale.scale);
		});
		this.stage.getViewport()?.positionChangeEvent$.subscribe((position) => {
			this.store.getState().setX(position.x);
			this.store.getState().setY(position.y);
		});
	}

	public setStage(stage: Stage) {
		this.stage = stage;
		this.listenViewportEvent();
	}

	public getStage() {
		return this.stage;
	}

	public clientToViewportLocal(clientX: number, clientY: number): PixiPoint {
		const viewport = this.stage.getViewport();
		const canvasRect = viewport.canvasEl.getBoundingClientRect();
		const stageX = clientX - canvasRect.left;
		const stageY = clientY - canvasRect.top;
		return viewport.toLocal(new PixiPoint(stageX, stageY));
	}

	public destroy(): void {}
}
