import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IActionManager, ISelectService, IShapeManager } from '@/domain/contract';
import { CreateShapeAction } from '@/domain/service/Action/Actions/CreateShapeAction';
import { DuplicateShortcutKey } from '@/domain/service/ShortcutKey/shortcutKeys/duplicate';
import { type ShapeData, ShapeStateEnum, ShapeTypeEnum } from '@/shape/contract';

interface ShapeMock {
	id: string;
	toData: Mock<[], ShapeData>;
	setState: Mock;
}

function createShape(data: ShapeData): ShapeMock {
	return {
		id: data.id,
		toData: vi.fn(() => data),
		setState: vi.fn(),
	};
}

function createShortcut(selectedShapes: ShapeMock[]) {
	const shortcut = new DuplicateShortcutKey();
	const copiedShapes = new Map<string, ShapeMock>();
	const selectService = {
		getSelectedShapes: vi.fn(() => selectedShapes),
		clearSelectedShapes: vi.fn(),
		setMultipleSelectedShapes: vi.fn(),
		updateMultiSelectOverlay: vi.fn(),
	};
	const shapeManager = {
		getShapeById: vi.fn((id: string) => copiedShapes.get(id)),
	};
	const actionManager = {
		push: vi.fn((action: CreateShapeAction) => {
			action.data.forEach((data) => copiedShapes.set(data.id, createShape(data)));
		}),
	};

	Object.assign(shortcut, {
		actionManager: actionManager as unknown as IActionManager,
		selectService: selectService as unknown as ISelectService,
		shapeManager: shapeManager as unknown as IShapeManager,
		ioc: {},
	});

	return { shortcut, actionManager, selectService, copiedShapes };
}

function getCreatedData(actionManager: { push: Mock }): ShapeData[] {
	const action = actionManager.push.mock.calls[0][0] as CreateShapeAction;
	expect(action).toBeInstanceOf(CreateShapeAction);
	return action.data;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('DuplicateShortcutKey', () => {
	it('复制单个图形并向右下偏移 10px，同时选中副本', () => {
		const sourceData: ShapeData = {
			id: 'source',
			type: ShapeTypeEnum.Rectangle,
			properties: {
				base: { x: 20, y: 30, width: 120, height: 80, rotation: 15 },
				fill: { color: 0xffffff, alpha: 0.5 },
				text: { text: '节点' },
			},
		};
		const source = createShape(sourceData);
		const { shortcut, actionManager, selectService, copiedShapes } = createShortcut([source]);
		const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

		shortcut.onKeyDown(event);

		const [copiedData] = getCreatedData(actionManager);
		expect(event.preventDefault).toHaveBeenCalledOnce();
		expect(copiedData.id).not.toBe(sourceData.id);
		expect(copiedData).toMatchObject({
			type: ShapeTypeEnum.Rectangle,
			properties: {
				base: { x: 30, y: 40, width: 120, height: 80, rotation: 15 },
				fill: sourceData.properties.fill,
				text: sourceData.properties.text,
			},
		});
		expect(sourceData.properties.base).toEqual({
			x: 20,
			y: 30,
			width: 120,
			height: 80,
			rotation: 15,
		});

		const copiedShape = copiedShapes.get(copiedData.id)!;
		expect(source.setState).toHaveBeenCalledWith(ShapeStateEnum.Normal);
		expect(copiedShape.setState).toHaveBeenCalledWith(ShapeStateEnum.Selected);
		expect(selectService.setMultipleSelectedShapes).toHaveBeenCalledWith([copiedShape]);
		expect(selectService.updateMultiSelectOverlay).toHaveBeenCalledWith([copiedShape]);
	});

	it('复制组合时重连选区内部端点，并让外部端点解除锚定后偏移', () => {
		const node = createShape({
			id: 'node',
			type: ShapeTypeEnum.Rectangle,
			properties: { base: { x: 100, y: 200, width: 80, height: 60 } },
		});
		const lineData: ShapeData = {
			id: 'line',
			type: ShapeTypeEnum.Line,
			properties: {
				base: { x: 180, y: 220, width: 120, height: 40 },
				line: {
					start: { x: 180, y: 220, shapeId: 'node', anchor: 'right' },
					end: { x: 300, y: 260, shapeId: 'outside-node', anchor: 'left' },
					midPoints: [{ x: 240, y: 230 }],
					routing: 'curved',
				},
			},
		};
		const line = createShape(lineData);
		const { shortcut, actionManager, copiedShapes } = createShortcut([node, line]);

		shortcut.onKeyDown({ preventDefault: vi.fn() } as unknown as KeyboardEvent);

		const copiedData = getCreatedData(actionManager);
		const copiedNode = copiedData.find(({ type }) => type === ShapeTypeEnum.Rectangle)!;
		const copiedLine = copiedData.find(({ type }) => type === ShapeTypeEnum.Line)!;
		expect(copiedLine.properties.base).toMatchObject({ x: 190, y: 230 });
		expect(copiedLine.properties.line).toEqual({
			start: { x: 190, y: 230, shapeId: copiedNode.id, anchor: 'right' },
			end: { x: 310, y: 270 },
			midPoints: [{ x: 250, y: 240 }],
			routing: 'curved',
		});

		for (const data of copiedData) {
			expect(copiedShapes.get(data.id)?.setState).toHaveBeenCalledWith(
				ShapeStateEnum.MultiSelected,
			);
		}
	});

	it('文本编辑时不匹配快捷键', () => {
		const { shortcut } = createShortcut([]);
		vi.stubGlobal('document', {
			activeElement: { tagName: 'TEXTAREA', isContentEditable: false },
		});

		expect(shortcut.isMatch({} as KeyboardEvent)).toBe(false);
	});

	it('没有选中图形时仅阻止浏览器默认行为', () => {
		const { shortcut, actionManager } = createShortcut([]);
		const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

		shortcut.onKeyDown(event);

		expect(event.preventDefault).toHaveBeenCalledOnce();
		expect(actionManager.push).not.toHaveBeenCalled();
	});
});
