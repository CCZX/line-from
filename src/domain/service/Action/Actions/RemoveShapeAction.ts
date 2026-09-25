import { ShapeData } from '@lineform/shape/contract';
import { AbsAction } from '../AbsAction';
import { ActionTypeEnum } from '../../../contract/Action';
import { IocContainerService } from '@lineform/common/contract';
import { CreateShapeAction } from './CreateShapeAction';
import { IShapeManager } from '@lineform/domain/contract';

export class RemoveShapeAction extends AbsAction<ShapeData[]> {
	public type: ActionTypeEnum.RemoveShape = ActionTypeEnum.RemoveShape;
	public data: ShapeData[];

	constructor(data: ShapeData[], ioc: IocContainerService) {
		super(ioc);
		this.data = data;
	}

	public genBackAction(): CreateShapeAction {
		const shapeManager = this.ioc.get<IShapeManager>(IShapeManager);
		const currentData = this.data.map(
			(item) => shapeManager.getShapeById(item.id)?.toData() ?? item,
		);
		return new CreateShapeAction(currentData, this.ioc);
	}
}
