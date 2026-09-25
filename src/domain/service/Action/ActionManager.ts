import { IActionExecute, IActionLogManager, IActionManager } from '../../contract/Action';
import { AbsAction } from './AbsAction';
import { provide } from 'inversify-binding-decorators';
import { inject, multiInject, optional, postConstruct } from 'inversify';
import {
	IPostActionInterceptor,
	IPreActionInterceptor,
} from '@lineform/domain/contract/Action/Interceptor';

@provide(IActionManager)
export class ActionManager implements IActionManager {
	@multiInject(IActionExecute)
	private executeList: IActionExecute[] = [];

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@multiInject(IPreActionInterceptor)
	@optional()
	private preInterceptorList: IPreActionInterceptor[] = [];

	@multiInject(IPostActionInterceptor)
	@optional()
	private postInterceptorList: IPostActionInterceptor[] = [];

	@postConstruct()
	public sortInterceptors() {
		this.preInterceptorList.sort((a, b) => a.order - b.order);
		this.postInterceptorList.sort((a, b) => a.order - b.order);
	}

	public push(action: AbsAction) {
		const needAddLog = action.getNeedAddLog();
		if (needAddLog) {
			this.actionLogManager.addAction(action);
		}

		this.preInterceptorList.forEach((item) => item.intercept(action));

		const execute = this.executeList.find((item) => item.type === action.type);
		if (execute) {
			execute.execute(action);
		}

		this.postInterceptorList.forEach((item) => item.intercept(action));
	}
}
