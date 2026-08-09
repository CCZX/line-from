import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IToolService } from '@/domain/contract';
import { ToolType } from '@/domain/contract';
import { ToolShortcutKey } from '@/domain/service/ShortcutKey/shortcutKeys/tool';

function createShortcut() {
	const setActiveTool = vi.fn();
	const shortcut = new ToolShortcutKey();
	Object.assign(shortcut, {
		toolService: {
			store: { getState: () => ({ setActiveTool }) },
		} as unknown as IToolService,
	});

	return { shortcut, setActiveTool };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ToolShortcutKey', () => {
	it.each([
		['v', ToolType.Select],
		['r', ToolType.Rect],
		['c', ToolType.Circle],
		['l', ToolType.Line],
		['a', ToolType.Arrow],
		['t', ToolType.Text],
	])('按 %s 切换到对应工具', (key, tool) => {
		const { shortcut, setActiveTool } = createShortcut();
		const event = {
			key,
			preventDefault: vi.fn(),
		} as unknown as KeyboardEvent;

		shortcut.onKeyDown(event);

		expect(event.preventDefault).toHaveBeenCalledOnce();
		expect(setActiveTool).toHaveBeenCalledWith(tool);
	});

	it.each(['INPUT', 'TEXTAREA', 'SELECT'])('焦点位于 %s 时不抢占按键', (tagName) => {
		const { shortcut } = createShortcut();
		vi.stubGlobal('document', {
			activeElement: { tagName, isContentEditable: false },
		});

		expect(shortcut.isMatch({} as KeyboardEvent)).toBe(false);
	});

	it('焦点位于可编辑元素时不抢占按键', () => {
		const { shortcut } = createShortcut();
		vi.stubGlobal('document', {
			activeElement: { tagName: 'DIV', isContentEditable: true },
		});

		expect(shortcut.isMatch({} as KeyboardEvent)).toBe(false);
	});

	it('画布状态下允许切换工具', () => {
		const { shortcut } = createShortcut();
		vi.stubGlobal('document', {
			activeElement: { tagName: 'BODY', isContentEditable: false },
		});

		expect(shortcut.isMatch({} as KeyboardEvent)).toBe(true);
	});
});
