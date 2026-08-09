import { Stage } from '@/canvas/core/Stage';
import { BaseShape } from '@/shape/BaseShape';
import { Graphics } from '@pixi/graphics';
import { StoreApi, UseBoundStore } from 'zustand';

export interface SelectionState {
	selectedShapeIds: string[];
	setSelectedShapeIds: (ids: string[]) => void;
	addSelectedShapeId: (id: string) => void;
	removeSelectedShapeId: (id: string) => void;
	clearSelectedShapeIds: () => void;
}

export interface ISelectService {
	store: UseBoundStore<StoreApi<SelectionState>>;

	setSelectedShape(shape: BaseShape): void;
	setMultipleSelectedShapes(shapes: BaseShape[]): void;
	clearSelectedShapes(): void;
	getSelectedShapeById(id: string): BaseShape | undefined;
	getSelectedShapes(): BaseShape[];
	removeSelectedShapeById(id: string): void;

	showMultiSelectOverlay(rect: Rectangle): void;
	hideMultiSelectOverlay(): void;
	updateMultiSelectOverlay(shapes: BaseShape[]): void;
	getMultiSelectOverlayRect(): Rectangle | null;

	addMarqueeGraphics(graphics: Graphics): void;
}
export const ISelectService = Symbol('ISelectService');
