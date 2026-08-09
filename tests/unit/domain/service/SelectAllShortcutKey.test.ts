import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ISelectService, IShapeManager } from '@/domain/contract';
import { SelectAllShortcutKey } from '@/domain/service/ShortcutKey/shortcutKeys/selectAll';
import type { BaseShape } from '@/shape/BaseShape';
import { ShapeStateEnum } from '@/shape/contract';

interface ShapeMock {
	id: string;
	setState: Mock;
}

function createShape(id: string): ShapeMock {
	return { id, setState: vi.fn() };
}

function createShortcut(shapes: ShapeMock[]) {
	const shortcut = new SelectAllShortcutKey();
	const selectService = {
		setMultipleSelectedShapes: vi.fn(),
		updateMultiSelectOverlay: vi.fn(),
	};
	Object.assign(shortcut, {
		shapeManager: { getAllShapes: vi.fn(() => shapes) } as unknown as IShapeManager,
		selectService: selectService as unknown as ISelectService,
	});

	return { shortcut, selectService };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('SelectAllShortcutKey', () => {
	it('全选多个图形并更新选择服务和多选框', () => {
		const shapes = [createShape('shape-1'), createShape('shape-2')];
		const { shortcut, selectService } = createShortcut(shapes);
		const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

		shortcut.onKeyDown(event);

		expect(event.preventDefault).toHaveBeenCalledOnce();
		shapes.forEach((shape) => {
			expect(shape.setState).toHaveBeenCalledWith(ShapeStateEnum.MultiSelected);
		});
		expect(selectService.setMultipleSelectedShapes).toHaveBeenCalledWith(shapes);
		expect(selectService.updateMultiSelectOverlay).toHaveBeenCalledWith(shapes);
	});

	it('只有一个图形时使用普通选中状态', () => {
		const shape = createShape('shape-1');
		const { shortcut } = createShortcut([shape]);

		shortcut.onKeyDown({ preventDefault: vi.fn() } as unknown as KeyboardEvent);

		expect(shape.setState).toHaveBeenCalledWith(ShapeStateEnum.Selected);
	});

	it('文本编辑时不匹配全选快捷键', () => {
		const { shortcut } = createShortcut([]);
		vi.stubGlobal('document', {
			activeElement: { tagName: 'TEXTAREA', isContentEditable: false },
		});

		expect(shortcut.isMatch({} as KeyboardEvent)).toBe(false);
	});
});
