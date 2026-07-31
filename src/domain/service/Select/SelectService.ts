import { Graphics } from 'pixi.js';
import { getShapesAABB } from '@/shape/geometry';
import { BaseShape } from '@/shape/BaseShape';
import { Stage } from '@/canvas/core/Stage';
import { ISelectService, SelectionState } from '@/domain/contract/SelectService';
import { provide } from 'inversify-binding-decorators';
import { create } from 'zustand';
import { IViewportService } from '@/domain/contract';
import { inject } from 'inversify';

const MULTI_SELECT_COLOR = 0x4a90d9;
const HANDLE_SIZE = 8;

const selectStore = create<SelectionState>((set) => ({
	selectedShapeIds: [],
	setSelectedShapeIds(ids) {
		set({ selectedShapeIds: ids });
	},
	addSelectedShapeId(id) {
		set((s) => ({
			selectedShapeIds: s.selectedShapeIds.includes(id)
				? s.selectedShapeIds
				: [...s.selectedShapeIds, id],
		}));
	},
	removeSelectedShapeId(id) {
		set((s) => ({
			selectedShapeIds: s.selectedShapeIds.filter((i) => i !== id),
		}));
	},
	clearSelectedShapeIds() {
		set({ selectedShapeIds: [] });
	},
}));

@provide(ISelectService)
export class SelectService implements ISelectService {
	@inject(IViewportService)
	private viewportService!: IViewportService;

	private selectedShapes: Map<string, BaseShape> = new Map();
	private multiSelectOverlay: Graphics | null = null;
	private overlayRect: Rectangle | null = null;

	public store = selectStore;

	public setSelectedShape(shape: BaseShape) {
		this.selectedShapes.set(shape.id, shape);
		selectStore.getState().addSelectedShapeId(shape.id);
	}

	public setMultipleSelectedShapes(shapes: BaseShape[]) {
		this.selectedShapes.clear();
		shapes.forEach((shape) => this.selectedShapes.set(shape.id, shape));
		selectStore.getState().setSelectedShapeIds(shapes.map((s) => s.id));
	}

	public clearSelectedShapes() {
		this.selectedShapes.clear();
		selectStore.getState().clearSelectedShapeIds();
	}

	public getSelectedShapeById(id: string) {
		return this.selectedShapes.get(id);
	}

	public getSelectedShapes() {
		return this.selectedShapes;
	}

	public removeSelectedShapeById(id: string) {
		this.selectedShapes.delete(id);
		selectStore.getState().removeSelectedShapeId(id);
	}

	public showMultiSelectOverlay(rect: Rectangle) {
		this.overlayRect = rect;
		if (!this.multiSelectOverlay) {
			this.multiSelectOverlay = new Graphics();
			const stage = this.viewportService.getStage();
			stage.getViewport().addChild(this.multiSelectOverlay);
		}
		this.drawOverlay(rect);
	}

	public hideMultiSelectOverlay() {
		if (this.multiSelectOverlay) {
			this.multiSelectOverlay.removeFromParent();
			this.multiSelectOverlay.destroy();
			this.multiSelectOverlay = null;
			this.overlayRect = null;
		}
	}

	public updateMultiSelectOverlay(shapes: BaseShape[]) {
		if (shapes.length < 2) {
			this.hideMultiSelectOverlay();
			return;
		}
		const rect = getShapesAABB(shapes);
		this.showMultiSelectOverlay(rect);
	}

	public getMultiSelectOverlayRect(): Rectangle | null {
		return this.overlayRect;
	}

	private drawOverlay(rect: Rectangle) {
		const g = this.multiSelectOverlay!;
		g.clear();

		const offset = 4;
		const x = rect.x - offset;
		const y = rect.y - offset;
		const w = rect.width + offset * 2;
		const h = rect.height + offset * 2;

		g.lineStyle(1, MULTI_SELECT_COLOR, 0.8);
		g.beginFill(0x4a90d9, 0.05);
		g.drawRect(x, y, w, h);
		g.endFill();

		g.beginFill(MULTI_SELECT_COLOR, 1);
		const hs = HANDLE_SIZE;
		const corners = [
			{ x: x - hs / 2, y: y - hs / 2 },
			{ x: x + w - hs / 2, y: y - hs / 2 },
			{ x: x + w - hs / 2, y: y + h - hs / 2 },
			{ x: x - hs / 2, y: y + h - hs / 2 },
		];
		for (const c of corners) {
			g.drawRect(c.x, c.y, hs, hs);
		}
		g.endFill();
	}

	public addMarqueeGraphics(graphics: Graphics) {
		const stage = this.viewportService.getStage();
		stage.getViewport().addChild(graphics);
	}
}
