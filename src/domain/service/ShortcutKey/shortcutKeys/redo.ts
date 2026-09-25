import { control, IActionLogManager, IShortcutKey, meta, shift } from '@lineform/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IShortcutKey)
export class RedoShortcutKey implements IShortcutKey {
	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	public name = '重做';
	public key = 'z';
	public fnKeys = [meta | shift, control | shift];

	public onKeyDown(e: KeyboardEvent): void {
		e.preventDefault();
		this.actionLogManager.redo();
	}

	public onKeyUp(_e: KeyboardEvent): void {}
}
