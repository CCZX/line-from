import { ShapeData } from '@/shape/contract';

export interface ICanvasInitService {
	init(data: ShapeData[]): void;
}
export const ICanvasInitService = Symbol('ICanvasInitService');
