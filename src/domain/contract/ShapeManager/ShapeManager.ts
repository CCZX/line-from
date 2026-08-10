import { BaseShape } from '@/shape/BaseShape';

export interface IShapeManager {
	setShape(shape: BaseShape, appendToStage?: boolean): void;

	/** 图形几何属性修改完成后刷新空间索引。 */
	refreshShapeIndex(id: string): void;

	getShapeById(id: string): BaseShape | undefined;

	/** point 为 viewport 世界坐标（clientToViewportLocal 的结果），非屏幕坐标 */
	getShapeByPoint(point: Point): BaseShape | undefined;

	/** 获取与世界坐标区域 AABB 相交的图形。 */
	getShapesByRect(rect: Rectangle): BaseShape[];

	getAllShapes(): BaseShape[];

	clearShapes(): void;

	removeShape(id: string): void;
}
export const IShapeManager = Symbol('IShapeManager');
