import { ShapeData } from '@/shape/contract';
import { AbsAction } from '../AbsAction';
import { ActionTypeEnum } from '../../../contract/Action';
import { IocContainerService } from '@/common/contract';
import { CreateShapeAction } from './CreateShapeAction';

export class RemoveShapeAction extends AbsAction<ShapeData[]> {
	public type: ActionTypeEnum.RemoveShape = ActionTypeEnum.RemoveShape;
	public data: ShapeData[];

	constructor(data: ShapeData[], ioc: IocContainerService) {
		super(ioc);
		this.data = data;
	}

	public genBackAction(): CreateShapeAction {
		return new CreateShapeAction(this.data, this.ioc);
	}
}
