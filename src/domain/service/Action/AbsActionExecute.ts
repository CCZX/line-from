import { injectable } from 'inversify';
import { AbsAction } from './AbsAction';
import { ActionTypeEnum, IActionExecute } from '../../contract/Action';

@injectable()
export abstract class AbsActionExecute<T = unknown> implements IActionExecute {
	public abstract type: ActionTypeEnum;

	public abstract execute(action: AbsAction<T>): void;
}
