import { Point as PixiPoint } from '@pixi/core';
import { BaseShape } from '@/shape/BaseShape';
import {
	IShapeManager,
	IViewportService,
	type ShapeHitTestOptions,
	type ShapeManagerState,
} from '../../contract';
import { provide } from 'inversify-binding-decorators';
import { inject } from 'inversify';
import { QuadTreeManager } from './QuadTreeManager';
import { getShapeWorldBounds } from './ShapeBounds';
import { create } from 'zustand';

@provide(IShapeManager)
export class ShapeManager implements IShapeManager {
	@inject(IViewportService)
	private viewportService!: IViewportService;

	private shapes: Map<string, BaseShape> = new Map();
	private shapeOrder: Map<string, number> = new Map();
	private nextShapeOrder = 0;
	private spatialIndex = new QuadTreeManager();

	public store = create<ShapeManagerState>(() => ({
		shapeCount: 0,
	}));

	public setShape(shape: BaseShape, appendToStage = true) {
		if (appendToStage) {
			const stage = this.viewportService.getStage();
			stage.appendShape(shape.container);
		}
		this.shapes.set(shape.id, shape);
		this.syncShapeCount();

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

	public getShapeByPoint(point: Point, options: ShapeHitTestOptions = {}) {
		const viewport = this.viewportService.getStage().getViewport();
		const requestedHitSlop = options.hitSlop ?? 0;
		const hitSlop = Number.isFinite(requestedHitSlop) ? Math.max(0, requestedHitSlop) : 0;
		const candidates = this.getShapesByRect({
			x: point.x - hitSlop,
			y: point.y - hitSlop,
			width: hitSlop * 2,
			height: hitSlop * 2,
		});
		const misses: Array<{ shape: BaseShape; localPoint: Point }> = [];

		for (let index = candidates.length - 1; index >= 0; index -= 1) {
			const shape = candidates[index];
			if (options.filter && !options.filter(shape)) {
				continue;
			}

			// 将 viewport 点转换为 shape 容器坐标系
			const local = shape.container.toLocal(new PixiPoint(point.x, point.y), viewport);
			const localPoint = { x: local.x, y: local.y };
			if (shape.containsPoint(localPoint)) {
				return shape;
			}
			misses.push({ shape, localPoint });
		}

		// 精确命中优先；只有指针不在任何候选图形内时才使用扩展命中区。
		if (hitSlop === 0) {
			return undefined;
		}

		let nearestShape: BaseShape | undefined;
		let nearestDistance = hitSlop;
		for (const { shape, localPoint } of misses) {
			const distance = shape.distanceToPoint(localPoint);
			if (distance > hitSlop) {
				continue;
			}
			if (!nearestShape || distance < nearestDistance) {
				nearestShape = shape;
				nearestDistance = distance;
			}
		}
		return nearestShape;
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
		this.syncShapeCount();
	}

	public removeShape(id: string) {
		const shape = this.shapes.get(id);
		if (shape) {
			const stage = this.viewportService.getStage();
			stage.removeShape(shape.container);
			this.spatialIndex.remove(id);
			this.shapeOrder.delete(id);
			this.shapes.delete(id);
			this.syncShapeCount();
		}
	}

	private syncShapeCount(): void {
		this.store.setState({ shapeCount: this.shapes.size });
	}
}
