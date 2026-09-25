import { inject } from 'inversify';
import { IAction, IActionLogManager, IActionManager } from '../../contract';
import { provide } from 'inversify-binding-decorators';
import { IocContainerService } from '@lineform/common/contract';
import { create } from 'zustand';

@provide(IActionLogManager)
export class ActionLogManager implements IActionLogManager {
	@inject(IocContainerService)
	private ioc!: IocContainerService;

	private undoStack: IAction<unknown>[] = [];
	private redoStack: IAction<unknown>[] = [];

	public store = create(() => ({
		canUndo: false,
		canRedo: false,
	}));

	/** 是否处于流式操作中（如拖拽过程） */
	private streaming = false;
	/** 流式操作中最后一条 action，用于标记本次流式操作已写入历史 */
	private streamLastAction: IAction<unknown> | null = null;

	public setStreamStart() {
		this.streaming = true;
		this.streamLastAction = null;
	}

	public setStreamEnd() {
		this.streaming = false;
		this.streamLastAction = null;
	}

	public undo() {
		if (this.undoStack.length === 0) {
			return;
		}

		const action = this.undoStack.pop()!;
		action.setNeedAddLog(false);

		const backAction = action.genBackAction();
		backAction.setNeedAddLog(false);
		this.redoStack.push(backAction);

		const actionManager = this.ioc.get<IActionManager>(IActionManager);
		actionManager.push(action);
		this.syncState();
	}

	public redo() {
		if (this.redoStack.length === 0) {
			return;
		}

		const forwardAction = this.redoStack.pop()!;
		const backAction = forwardAction.genBackAction();
		backAction.setNeedAddLog(false);
		this.undoStack.push(backAction);

		const actionManager = this.ioc.get<IActionManager>(IActionManager);
		actionManager.push(forwardAction);
		this.syncState();
	}

	public clear(): void {
		this.undoStack = [];
		this.redoStack = [];
		this.streaming = false;
		this.streamLastAction = null;
		this.syncState();
	}

	public addAction(action: IAction<unknown>) {
		if (this.streaming) {
			// 流式操作中只记录第一条的 back action（代表操作前的原始状态）
			if (this.streamLastAction === null) {
				const backAction = action.genBackAction();
				this.undoStack.push(backAction);
			}
			this.streamLastAction = action;
		} else {
			const backAction = action.genBackAction();
			this.undoStack.push(backAction);
		}

		this.redoStack = [];
		this.syncState();
	}

	private syncState(): void {
		this.store.setState({
			canUndo: this.undoStack.length > 0,
			canRedo: this.redoStack.length > 0,
		});
	}
}
