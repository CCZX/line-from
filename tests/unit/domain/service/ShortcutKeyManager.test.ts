import { describe, expect, it, vi } from 'vitest';
import { control, IShortcutKey, meta, shift } from '@/domain/contract';
import { ShortcutKeyManager } from '@/domain/service/ShortcutKey/ShortcutKeyManager';

vi.mock('@/common/context', () => ({
	provideMultiple: () => () => undefined,
}));

function keyboardEvent(
	key: string,
	modifiers: Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>> = {},
): KeyboardEvent {
	return {
		key,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		...modifiers,
	} as KeyboardEvent;
}

function createManager(shortcutKeys: IShortcutKey[]): ShortcutKeyManager {
	const manager = new ShortcutKeyManager();
	Object.assign(manager, { shortcutKeys });
	return manager;
}

function keyDown(manager: ShortcutKeyManager, event: KeyboardEvent): void {
	(manager as unknown as { onKeyDown: (event: KeyboardEvent) => void }).onKeyDown(event);
}

describe('ShortcutKeyManager', () => {
	it('根据功能键位掩码分发 Meta 和 Control 快捷键', () => {
		const shortcut: IShortcutKey = {
			name: '撤销',
			key: 'z',
			fnKeys: [meta, control],
			onKeyDown: vi.fn(),
			onKeyUp: vi.fn(),
		};
		const manager = createManager([shortcut]);

		keyDown(manager, keyboardEvent('z', { metaKey: true }));
		keyDown(manager, keyboardEvent('Z', { ctrlKey: true }));
		keyDown(manager, keyboardEvent('z', { ctrlKey: true, shiftKey: true }));

		expect(shortcut.onKeyDown).toHaveBeenCalledTimes(2);
	});

	it('支持组合功能键和多个普通键', () => {
		const redo: IShortcutKey = {
			name: '重做',
			key: 'z',
			fnKeys: [meta | shift, control | shift],
			onKeyDown: vi.fn(),
			onKeyUp: vi.fn(),
		};
		const remove: IShortcutKey = {
			name: '删除',
			key: ['Delete', 'Backspace'],
			fnKeys: [],
			onKeyDown: vi.fn(),
			onKeyUp: vi.fn(),
		};
		const manager = createManager([redo, remove]);

		keyDown(manager, keyboardEvent('z', { ctrlKey: true, shiftKey: true }));
		keyDown(manager, keyboardEvent('Backspace'));
		keyDown(manager, keyboardEvent('Backspace', { ctrlKey: true }));

		expect(redo.onKeyDown).toHaveBeenCalledOnce();
		expect(remove.onKeyDown).toHaveBeenCalledOnce();
	});

	it('通用匹配成功后继续执行快捷键的业务 isMatch', () => {
		const isMatch = vi.fn(() => false);
		const shortcut: IShortcutKey = {
			name: '业务快捷键',
			key: 'k',
			fnKeys: [control],
			isMatch,
			onKeyDown: vi.fn(),
			onKeyUp: vi.fn(),
		};
		const manager = createManager([shortcut]);

		keyDown(manager, keyboardEvent('x', { ctrlKey: true }));
		expect(isMatch).not.toHaveBeenCalled();

		keyDown(manager, keyboardEvent('k', { ctrlKey: true }));
		expect(isMatch).toHaveBeenCalledOnce();
		expect(shortcut.onKeyDown).not.toHaveBeenCalled();
	});

	it('未定义 Alt 时不分发包含 Alt 的按键', () => {
		const shortcut: IShortcutKey = {
			name: '撤销',
			key: 'z',
			fnKeys: [control],
			onKeyDown: vi.fn(),
			onKeyUp: vi.fn(),
		};
		const manager = createManager([shortcut]);

		keyDown(manager, keyboardEvent('z', { ctrlKey: true, altKey: true }));

		expect(shortcut.onKeyDown).not.toHaveBeenCalled();
	});
});
