import { AbsActionExecute } from '../AbsActionExecute';
import { CreateShapeAction } from '../Actions/CreateShapeAction';
import { ActionTypeEnum, IActionExecute } from '../../../contract/Action';
import { IShapeManager } from '@/domain/contract';
import { inject } from 'inversify';
import { IocContainerService } from '@/common/contract';
import { provide } from 'inversify-binding-decorators';
import { createShapeFromData } from '@/shape/ShapeFactory';
import { ShapeTypeEnum } from '@/shape/contract';

@provide(IActionExecute)
export class CreateShapeActionExecute extends AbsActionExecute {
	public type: ActionTypeEnum = ActionTypeEnum.CreateShape;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IocContainerService)
	private iocContainerService!: IocContainerService;

	public execute(action: CreateShapeAction): void {
		for (const data of action.data) {
			const shape = createShapeFromData(
				data,
				{ ioc: this.iocContainerService },
				ShapeTypeEnum.Rectangle,
			);
			if (shape) {
				this.shapeManager.setShape(shape);
			}
		}
	}
}
