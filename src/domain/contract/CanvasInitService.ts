import { ShapeData } from '@lineform/shape/contract';

export interface ICanvasInitService {
	init(data: ShapeData[]): void;
	replace(data: ShapeData[]): void;
}
export const ICanvasInitService = Symbol('ICanvasInitService');
