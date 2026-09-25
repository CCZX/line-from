import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextEditorService } from '@lineform/domain/service/TextEditorService';
import { ShapePropertyEnum, ShapeTypeEnum } from '@lineform/shape/contract';

vi.mock('@lineform/i18n', () => ({
	default: {
		t: vi.fn(() => '编辑图形文字'),
		on: vi.fn(),
	},
}));

describe('TextEditorService', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('文字编辑态的滚轮事件不会触发浏览器默认缩放', () => {
		const listeners = new Map<string, EventListener>();
		const textarea = {
			style: {},
			setAttribute: vi.fn(),
			addEventListener: vi.fn(
				(type: string, listener: EventListener, _options?: AddEventListenerOptions) => {
					listeners.set(type, listener);
				},
			),
		};
		vi.stubGlobal('document', {
			createElement: vi.fn(() => textarea),
			body: { appendChild: vi.fn() },
		});

		const service = new TextEditorService();
		const preventDefault = vi.fn();
		(service as unknown as { getTextarea: () => HTMLTextAreaElement }).getTextarea();

		expect(textarea.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), {
			passive: false,
		});
		listeners.get('wheel')?.({ preventDefault } as unknown as WheelEvent);

		expect(preventDefault).toHaveBeenCalledOnce();
	});

	it('input 事件直接更新 Pixi 使用的文字属性', () => {
		const listeners = new Map<string, EventListener>();
		const textarea = {
			value: '',
			style: {},
			setAttribute: vi.fn(),
			addEventListener: vi.fn((type: string, listener: EventListener) => {
				listeners.set(type, listener);
			}),
		};
		vi.stubGlobal('document', {
			createElement: vi.fn(() => textarea),
			body: { appendChild: vi.fn() },
		});

		const textProperty = { update: vi.fn() };
		const shape = {
			getProperty: vi.fn(() => textProperty),
		};
		const selectionService = { refresh: vi.fn() };
		const service = new TextEditorService();
		const internals = service as unknown as {
			getTextarea: () => HTMLTextAreaElement;
			activeShape: typeof shape;
			selectionService: typeof selectionService;
		};
		internals.getTextarea();
		internals.activeShape = shape;
		internals.selectionService = selectionService;
		textarea.value = 'Pixi 实时文字';

		listeners.get('input')?.({} as Event);

		expect(textProperty.update).toHaveBeenCalledWith({ text: 'Pixi 实时文字' });
		expect(selectionService.refresh).toHaveBeenCalledOnce();
	});

	it('提交实时预览文字前恢复原值，使撤销记录仍指向编辑前内容', () => {
		const textProperty = { set: vi.fn(), draw: vi.fn() };
		const baseProperty = { value: { x: 10, y: 20, width: 100, height: 60 } };
		const shape = {
			id: 'text-1',
			type: ShapeTypeEnum.Text,
			getProperty: vi.fn((type: ShapePropertyEnum) =>
				type === ShapePropertyEnum.Text ? textProperty : baseProperty,
			),
		};
		const textarea = { value: '新文字', style: { display: 'block' } };
		const actionManager = { push: vi.fn() };
		const selectionService = { end: vi.fn() };
		vi.stubGlobal('window', { removeEventListener: vi.fn() });

		const service = new TextEditorService();
		const internals = service as unknown as {
			activeShape: typeof shape | null;
			originalValue: { text: string } | null;
			textarea: typeof textarea | null;
			actionManager: typeof actionManager;
			selectionService: typeof selectionService;
			ioc: object;
		};
		internals.activeShape = shape;
		internals.originalValue = { text: '原文字' };
		internals.textarea = textarea;
		internals.actionManager = actionManager;
		internals.selectionService = selectionService;
		internals.ioc = {};

		service.commit(shape as never);

		expect(textProperty.set).toHaveBeenCalledWith({ text: '原文字' });
		const action = actionManager.push.mock.calls[0][0];
		expect(action.data[0].properties.text).toEqual({ text: '新文字' });
		expect(textProperty.set.mock.invocationCallOrder[0]).toBeLessThan(
			actionManager.push.mock.invocationCallOrder[0],
		);
	});
});
