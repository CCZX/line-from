import { Point as PixiPoint } from '@pixi/core';
import { BaseShape } from '@/shape/BaseShape';
import { IShapeManager, IViewportService } from '../../contract';
import { provide } from 'inversify-binding-decorators';
import { inject } from 'inversify';
import { QuadTreeManager } from './QuadTreeManager';
import { getShapeWorldBounds } from './ShapeBounds';

@provide(IShapeManager)
export class ShapeManager implements IShapeManager {
	@inject(IViewportService)
	private viewportService!: IViewportService;

	private shapes: Map<string, BaseShape> = new Map();
	private shapeOrder: Map<string, number> = new Map();
	private nextShapeOrder = 0;
	private spatialIndex = new QuadTreeManager();

	public setShape(shape: BaseShape, appendToStage = true) {
		if (appendToStage) {
			const stage = this.viewportService.getStage();
			stage.appendShape(shape.container);
		}
		this.shapes.set(shape.id, shape);

		let order = this.shapeOrder.get(shape.id);
		if (order === undefined) {
			order = this.nextShapeOrder++;
			this.shapeOrder.set(shape.id, order);
		}
		this.spatialIndex.upsert({ id: shape.id, bounds: getShapeWorldBounds(shape), order });
	}

	public refreshShapeIndex(id: string): void {
		const shape = this.shapes.get(id);
		const order = this.shapeOrder.get(id);
		if (!shape || order === undefined) {
			this.spatialIndex.remove(id);
			return;
		}

		this.spatialIndex.upsert({ id, bounds: getShapeWorldBounds(shape), order });
	}

	public getShapeById(id: string) {
		return this.shapes.get(id);
	}

	public getShapeByPoint(point: Point) {
		const viewport = this.viewportService.getStage().getViewport();
		const candidates = this.getShapesByRect({ x: point.x, y: point.y, width: 0, height: 0 });
		for (let index = candidates.length - 1; index >= 0; index -= 1) {
			const shape = candidates[index];
			// 将 viewport 点转换为 shape 容器坐标系
			const local = shape.container.toLocal(new PixiPoint(point.x, point.y), viewport);
			if (shape.containsPoint({ x: local.x, y: local.y })) {
				return shape;
			}
		}
	}

	public getShapesByRect(rect: Rectangle): BaseShape[] {
		return this.spatialIndex
			.query(rect)
			.map(({ id }) => this.shapes.get(id))
			.filter((shape): shape is BaseShape => shape !== undefined);
	}

	public getAllShapes(): BaseShape[] {
		return Array.from(this.shapes.values());
	}

	public clearShapes(): void {
		const stage = this.viewportService.getStage();
		for (const shape of this.shapes.values()) {
			stage.removeShape(shape.container);
			shape.container.destroy({ children: true });
		}
		this.shapes.clear();
		this.shapeOrder.clear();
		this.nextShapeOrder = 0;
		this.spatialIndex.clear();
	}

	public removeShape(id: string) {
		const shape = this.shapes.get(id);
		if (shape) {
			const stage = this.viewportService.getStage();
			stage.removeShape(shape.container);
			this.spatialIndex.remove(id);
			this.shapeOrder.delete(id);
			this.shapes.delete(id);
		}
	}
}
