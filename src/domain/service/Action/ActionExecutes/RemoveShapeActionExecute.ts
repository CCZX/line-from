import { AbsActionExecute } from '../AbsActionExecute';
import { RemoveShapeAction } from '../Actions/RemoveShapeAction';
import { ActionTypeEnum, IActionExecute } from '../../../contract/Action';
import { IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IActionExecute)
export class RemoveShapeActionExecute extends AbsActionExecute {
	public type: ActionTypeEnum = ActionTypeEnum.RemoveShape;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	public execute(action: RemoveShapeAction): void {
		for (const { id } of action.data) {
			this.selectService.removeSelectedShapeById(id);
			this.shapeManager.removeShape(id);
		}

		const remaining = this.selectService.getSelectedShapes();
		this.selectService.updateMultiSelectOverlay(remaining);
	}
}
