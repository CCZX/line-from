import { AbsActionExecute } from '../AbsActionExecute';
import { RemoveShapeAction } from '../actions/RemoveShapeAction';
import { ActionTypeEnum, IActionExecute } from '../../../contract/Action';
import { IShapeManager } from '@/domain/contract';
import { ILineAnchorService } from '@/domain/contract/LineAnchorService';
import { ISelectService } from '@/domain/contract/SelectService';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IActionExecute)
export class RemoveShapeActionExecute extends AbsActionExecute {
	public type: ActionTypeEnum = ActionTypeEnum.RemoveShape;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ILineAnchorService)
	private lineAnchorService!: ILineAnchorService;

	@inject(ISelectService)
	private selectService!: ISelectService;

	public execute(action: RemoveShapeAction): void {
		const removedIds = new Set(action.data.map((d) => d.id));

		for (const { id } of action.data) {
			this.selectService.removeSelectedShapeById(id);
			this.shapeManager.removeShape(id);
		}

		// 清理锚定到已删除图形的连线端点引用
		this.lineAnchorService.detach(removedIds);

		const remaining = Array.from(this.selectService.getSelectedShapes().values());
		this.selectService.updateMultiSelectOverlay(remaining);
	}
}
