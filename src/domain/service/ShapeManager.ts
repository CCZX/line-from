import { Point as PixiPoint } from 'pixi.js';
import { BaseShape } from '@/shape/BaseShape';
import { Stage } from '@/canvas/core/Stage';
import { IShapeManager, IViewportService } from '../contract';
import { provide } from 'inversify-binding-decorators';
import { inject } from 'inversify';

@provide(IShapeManager)
export class ShapeManager implements IShapeManager {
	@inject(IViewportService)
	private viewportService!: IViewportService;

	private shapes: Map<string, BaseShape> = new Map();

	public setShape(shape: BaseShape, appendToStage = true) {
		if (appendToStage) {
			const stage = this.viewportService.getStage();
			stage.appendShape(shape.container);
		}
		this.shapes.set(shape.id, shape);
	}

	public getShapeById(id: string) {
		return this.shapes.get(id);
	}

	public getShapeByPoint(point: Point) {
		const viewport = this.viewportService.getStage().getViewport();
		for (const [, shape] of this.shapes) {
			// 将 viewport 点转换为 shape 容器坐标系
			const local = shape.container.toLocal(new PixiPoint(point.x, point.y), viewport);
			if (shape.containsPoint({ x: local.x, y: local.y })) {
				return shape;
			}
		}
	}

	public getAllShapes(): BaseShape[] {
		return Array.from(this.shapes.values());
	}

	public removeShape(id: string) {
		const shape = this.shapes.get(id);
		if (shape) {
			const stage = this.viewportService.getStage();
			stage.removeShape(shape.container);
			this.shapes.delete(id);
		}
	}
}
