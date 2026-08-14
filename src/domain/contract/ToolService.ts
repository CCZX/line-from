import { StoreApi, UseBoundStore } from 'zustand';

export enum ToolType {
	Select = 'select',
	Pen = 'pen',
	Eraser = 'eraser',
	Rect = 'rect',
	RoundedRect = 'roundedRect',
	Diamond = 'diamond',
	Circle = 'circle',
	Line = 'line',
	Arrow = 'arrow',
	Text = 'text',
}

export interface ToolState {
	activeTool: ToolType;
	setActiveTool: (tool: ToolType) => void;
}

export interface IToolService {
	store: UseBoundStore<StoreApi<ToolState>>;
}
export const IToolService = Symbol('IToolService');
