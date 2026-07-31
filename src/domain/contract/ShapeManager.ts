import { Stage } from '@/canvas/core/Stage';
import { BaseShape } from '@/shape/BaseShape';

export interface IShapeManager {
	setShape(shape: BaseShape, appendToStage?: boolean): void;

	getShapeById(id: string): BaseShape | undefined;

	/** point 为 viewport 世界坐标（clientToViewportLocal 的结果），非屏幕坐标 */
	getShapeByPoint(point: Point): BaseShape | undefined;

	getAllShapes(): BaseShape[];

	clearShapes(): void;

	removeShape(id: string): void;
}
export const IShapeManager = Symbol('IShapeManager');
