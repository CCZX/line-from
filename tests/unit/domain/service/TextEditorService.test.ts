import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextEditorService } from '@/domain/service/TextEditorService';

vi.mock('@/i18n', () => ({
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
});
