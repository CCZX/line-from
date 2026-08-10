import { IShapeManager } from '@/domain/contract';
import { ActionTypeEnum, IAction, IPostActionInterceptor } from '@/domain/contract/Action';
import { ShapeData, ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { LineProperty } from '@/shape/property/LineProperty';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

/** 图形属性更新完成后，重算锚定到这些图形的连线端点。 */
@provide(IPostActionInterceptor)
export class UpdateLinePostActionInterceptor implements IPostActionInterceptor {
	public order = 0;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	public intercept(action: IAction<unknown>): void {
		if (action.type !== ActionTypeEnum.UpdateShapeProps) {
			return;
		}

		const shapeData = action.data as ShapeData[];
		const changedShapeIds = new Set(shapeData.map(({ id }) => id));

		for (const shape of this.shapeManager.getAllShapes()) {
			if (shape.type !== ShapeTypeEnum.Line) {
				continue;
			}

			const lineProp = shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
			if (!lineProp) {
				continue;
			}

			const value = lineProp.value;
			const startChanged = !!value.start.shapeId && changedShapeIds.has(value.start.shapeId);
			const endChanged = !!value.end.shapeId && changedShapeIds.has(value.end.shapeId);
			if (!startChanged && !endChanged) {
				continue;
			}

			const start = { ...value.start };
			const end = { ...value.end };
			if (startChanged) {
				const point = lineProp.resolveEndpoint(value.start, value.end);
				start.x = point.x;
				start.y = point.y;
			}
			if (endChanged) {
				const point = lineProp.resolveEndpoint(value.end, value.start);
				end.x = point.x;
				end.y = point.y;
			}

			shape.updateProperty(ShapePropertyEnum.Line, { ...value, start, end });
			this.shapeManager.refreshShapeIndex(shape.id);
		}
	}
}
