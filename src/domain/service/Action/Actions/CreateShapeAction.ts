import { ShapeData } from '@lineform/shape/contract';
import { AbsAction } from '../AbsAction';
import { ActionTypeEnum } from '../../../contract/Action';
import { IocContainerService } from '@lineform/common/contract';
import { RemoveShapeAction } from './RemoveShapeAction';

export class CreateShapeAction extends AbsAction<ShapeData[]> {
	public type: ActionTypeEnum.CreateShape = ActionTypeEnum.CreateShape;
	public data: ShapeData[];

	constructor(data: ShapeData[], ioc: IocContainerService) {
		super(ioc);
		this.data = data;
	}

	public genBackAction(): RemoveShapeAction {
		return new RemoveShapeAction(this.data, this.ioc);
	}
}
