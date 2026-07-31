import { IAction } from './Action';

export interface IActionLogManager {
	/**
	 * 设置流式操作开始
	 *
	 * 比如拖拽更新位置的操作, 中间可能产生好几个更新位置的 Action
	 *
	 * action1 -> action2 -> action3 -> action4 -> action5 -> action6 -> action7 -> action8 -> action9
	 *
	 *
	 */
	setStreamStart(): void;

	setStreamEnd(): void;

	undo(): void;

	redo(): void;

	addAction(action: IAction<unknown>): void;
}
export const IActionLogManager = Symbol('IActionLogManager');
