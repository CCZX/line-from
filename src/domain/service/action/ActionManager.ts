import { IActionExecute, IActionLogManager, IActionManager } from '../../contract/Action';
import { AbsAction } from './AbsAction';
import { provide } from 'inversify-binding-decorators';
import { inject, multiInject } from 'inversify';

@provide(IActionManager)
export class ActionManager implements IActionManager {
	@multiInject(IActionExecute)
	private executeList: IActionExecute[] = [];

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	public push(action: AbsAction) {
		const needAddLog = action.getNeedAddLog();
		if (needAddLog) {
			this.actionLogManager.addAction(action);
		}

		const execute = this.executeList.find((item) => item.type === action.type);
		if (execute) {
			execute.execute(action);
		}
	}
}
