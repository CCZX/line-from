import { IocContainerService } from '@/common/contract';
import { ActionTypeEnum, IAction } from '../../contract/Action';

export abstract class AbsAction<T = unknown> implements IAction<T> {
	protected ioc: IocContainerService;

	protected needAddLog = true;

	public abstract type: ActionTypeEnum;

	public abstract data: T;

	constructor(ioc: IocContainerService) {
		this.ioc = ioc;
	}

	public abstract genBackAction(): IAction<T>;

	public setNeedAddLog(needAdd: boolean) {
		this.needAddLog = needAdd;
	}

	public getNeedAddLog(): boolean {
		return this.needAddLog;
	}
}
