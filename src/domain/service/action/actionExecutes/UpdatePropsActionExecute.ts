import { AbsActionExecute } from '../AbsActionExecute';
import { ActionTypeEnum, IActionExecute } from '../../../contract/action';
import { IShapeManager } from '@/domain/contract';
import { ILineAnchorService } from '@/domain/contract/LineAnchorService';
import { ISelectService } from '@/domain/contract/SelectService';
import { ShapePropertyEnum } from '@/shape/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { UpdatePropsAction } from '../actions/UpdatePropsAction';
import { BaseShape } from '@/shape/BaseShape';

@provide(IActionExecute)
export class UpdatePropsActionExecute extends AbsActionExecute {
	public type: ActionTypeEnum = ActionTypeEnum.UpdateShapeProps;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ILineAnchorService)
	private lineAnchorService!: ILineAnchorService;

	@inject(ISelectService)
	private selectService!: ISelectService;

	public execute(action: UpdatePropsAction): void {
		const shapes: BaseShape[] = [];
		for (const { id, properties } of action.data) {
			const shape = this.shapeManager.getShapeById(id);
			if (!shape) {
				continue;
			}

			shape.updateProperty(ShapePropertyEnum.Base, properties.base);

			if (properties.fill) {
				shape.updateProperty(ShapePropertyEnum.Fill, properties.fill);
			}

			if (properties.stroke) {
				shape.updateProperty(ShapePropertyEnum.Stroke, properties.stroke);
			}

			if (properties.text) {
				shape.updateProperty(ShapePropertyEnum.Text, properties.text);
			}

			if (properties.line) {
				shape.updateProperty(ShapePropertyEnum.Line, properties.line);
			}

			shapes.push(shape);
		}

		this.lineAnchorService.reanchor(new Set(shapes.map((s) => s.id)));

		this.selectService.updateMultiSelectOverlay(shapes);
	}
}
