import { IShapeManager } from '@/domain/contract';
import { ActionTypeEnum, IAction, IPreActionInterceptor } from '@/domain/contract/Action';
import { ShapeData, ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { LineProperty } from '@/shape/property/LineProperty';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

/** 删除图形前，解除连线对待删除图形的锚定并保留当前端点坐标。 */
@provide(IPreActionInterceptor)
export class RemoveLinePreActionInterceptor implements IPreActionInterceptor {
	public order = 0;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	public intercept(action: IAction<unknown>): void {
		if (action.type !== ActionTypeEnum.RemoveShape) {
			return;
		}

		const shapeData = action.data as ShapeData[];
		const removedShapeIds = new Set(shapeData.map(({ id }) => id));

		for (const shape of this.shapeManager.getAllShapes()) {
			if (shape.type !== ShapeTypeEnum.Line) {
				continue;
			}

			const lineProp = shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
			if (!lineProp) {
				continue;
			}

			const value = lineProp.value;
			let changed = false;
			const start = { ...value.start };
			const end = { ...value.end };

			if (value.start.shapeId && removedShapeIds.has(value.start.shapeId)) {
				delete start.shapeId;
				delete start.anchor;
				changed = true;
			}
			if (value.end.shapeId && removedShapeIds.has(value.end.shapeId)) {
				delete end.shapeId;
				delete end.anchor;
				changed = true;
			}

			if (changed) {
				shape.setProperty(ShapePropertyEnum.Line, { ...value, start, end });
				this.shapeManager.refreshShapeIndex(shape.id);
			}
		}
	}
}
