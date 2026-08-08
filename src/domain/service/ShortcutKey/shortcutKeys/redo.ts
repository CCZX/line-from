import { IActionLogManager, IShortcutKey } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IShortcutKey)
export class RedoShortcutKey implements IShortcutKey {
	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	public name = '重做';
	public key = 'z';
	public fnKeys = ['Ctrl+Shift+Z', 'Ctrl+Y'];

	public isMatch(e: KeyboardEvent): boolean {
		return (
			(e.ctrlKey || e.metaKey) &&
			((e.shiftKey && e.key.toLowerCase() === 'z') || (!e.shiftKey && e.key.toLowerCase() === 'y'))
		);
	}

	public onKeyDown(e: KeyboardEvent): void {
		e.preventDefault();
		this.actionLogManager.redo();
	}

	public onKeyUp(_e: KeyboardEvent): void {}
}
