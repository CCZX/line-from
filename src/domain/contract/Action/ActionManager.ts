import { IAction } from './Action';

export interface IActionManager {
	push(action: IAction<unknown>): void;
}

export const IActionManager = Symbol('IActionManager');
