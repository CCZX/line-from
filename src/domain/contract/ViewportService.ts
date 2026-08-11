import { Stage } from '@/canvas/core/Stage';
import { Point as PixiPoint } from '@pixi/core';
import { StoreApi, UseBoundStore } from 'zustand';

export interface ViewportState {
	x: number;
	y: number;
	scale: number;

	setScale: (scale: number) => void;
	setX: (x: number) => void;
	setY: (y: number) => void;
}

export interface IViewportService {
	store: UseBoundStore<StoreApi<ViewportState>>;

	setStage(stage: Stage): void;
	getStage(): Stage;
	zoomIn(): void;
	zoomOut(): void;
	resetZoom(): void;

	clientToViewportLocal(clientX: number, clientY: number): PixiPoint;
	getVisibleWorldRect(): Rectangle;
}
export const IViewportService = Symbol('IViewportService');
