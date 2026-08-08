import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ActionTypeEnum, IAction, IActionManager, IShapeManager } from '@/domain/contract';
import { ActionLogManager } from '@/domain/service/Action/ActionLogManager';
import { RemoveShapeAction } from '@/domain/service/Action/Actions/RemoveShapeAction';
import type { IocContainerService } from '@/common/contract';
import { ShapeTypeEnum } from '@/shape/contract';

class TestAction implements IAction<string> {
	public type = ActionTypeEnum.UpdateShapeProps;
	public backAction!: TestAction;
	private needAddLog = true;

	constructor(public data: string) {}

	public genBackAction(): TestAction {
		return this.backAction;
	}

	public setNeedAddLog(needAdd: boolean): void {
		this.needAddLog = needAdd;
	}

	public getNeedAddLog(): boolean {
		return this.needAddLog;
	}
}

function createActionPair(): { forward: TestAction; back: TestAction } {
	const forward = new TestAction('forward');
	const back = new TestAction('back');
	forward.backAction = back;
	back.backAction = forward;
	return { forward, back };
}

describe('ActionLogManager', () => {
	let manager: ActionLogManager;
	let push: Mock;

	beforeEach(() => {
		push = vi.fn();
		manager = new ActionLogManager();
		Object.assign(manager, {
			ioc: {
				get: (token: symbol) => (token === IActionManager ? { push } : undefined),
			},
		});
	});

	it('undo 和 redo 后仍可继续 undo', () => {
		const { forward, back } = createActionPair();

		manager.addAction(forward);
		expect(manager.store.getState()).toEqual({ canUndo: true, canRedo: false });

		manager.undo();
		expect(push).toHaveBeenLastCalledWith(back);
		expect(manager.store.getState()).toEqual({ canUndo: false, canRedo: true });

		manager.redo();
		expect(push).toHaveBeenLastCalledWith(forward);
		expect(manager.store.getState()).toEqual({ canUndo: true, canRedo: false });

		manager.undo();
		expect(push).toHaveBeenLastCalledWith(back);
		expect(push).toHaveBeenCalledTimes(3);
	});

	it('新动作会清空 redo，clear 会重置按钮状态', () => {
		const first = createActionPair();
		const second = createActionPair();

		manager.addAction(first.forward);
		manager.undo();
		expect(manager.store.getState().canRedo).toBe(true);

		manager.addAction(second.forward);
		expect(manager.store.getState()).toEqual({ canUndo: true, canRedo: false });

		manager.clear();
		expect(manager.store.getState()).toEqual({ canUndo: false, canRedo: false });
	});

	it('重做拖拽创建时使用图形的最终数据', () => {
		const initialData = {
			id: 'shape-1',
			type: ShapeTypeEnum.Rectangle,
			properties: { base: { x: 10, y: 20, width: 0, height: 0 } },
		};
		const finalData = {
			...initialData,
			properties: { base: { x: 10, y: 20, width: 160, height: 90 } },
		};
		const ioc = {
			get: (token: symbol) =>
				token === IShapeManager
					? { getShapeById: () => ({ toData: () => finalData }) }
					: undefined,
		} as unknown as IocContainerService;
		const removeAction = new RemoveShapeAction([initialData], ioc);

		expect(removeAction.genBackAction().data).toEqual([finalData]);
	});
});
