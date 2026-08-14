import { IShortcutKey, IToolService, ToolType } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

const TOOL_BY_KEY: Record<string, ToolType> = {
	v: ToolType.Select,
	r: ToolType.Rect,
	u: ToolType.RoundedRect,
	d: ToolType.Diamond,
	c: ToolType.Circle,
	l: ToolType.Line,
	a: ToolType.Arrow,
	t: ToolType.Text,
};

@provide(IShortcutKey)
export class ToolShortcutKey implements IShortcutKey {
	@inject(IToolService)
	private toolService!: IToolService;

	public name = '切换工具';
	public key = Object.keys(TOOL_BY_KEY);
	public fnKeys = [];

	public isMatch(_event: KeyboardEvent): boolean {
		const element = document.activeElement as HTMLElement | null;
		if (!element) {
			return true;
		}

		return !(
			element.tagName === 'INPUT' ||
			element.tagName === 'TEXTAREA' ||
			element.tagName === 'SELECT' ||
			element.isContentEditable
		);
	}

	public onKeyDown(event: KeyboardEvent): void {
		const tool = TOOL_BY_KEY[event.key.toLowerCase()];
		if (!tool) {
			return;
		}

		event.preventDefault();
		this.toolService.store.getState().setActiveTool(tool);
	}

	public onKeyUp(_event: KeyboardEvent): void {}
}
