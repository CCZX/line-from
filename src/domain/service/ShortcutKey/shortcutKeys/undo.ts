import { control, IActionLogManager, IShortcutKey, meta } from '@/domain/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IShortcutKey)
export class UndoShortcutKey implements IShortcutKey {
	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	public name = '撤销';
	public key = 'z';
	public fnKeys = [meta, control];

	public onKeyDown(e: KeyboardEvent): void {
		e.preventDefault();
		this.actionLogManager.undo();
	}

	public onKeyUp(_e: KeyboardEvent): void {}
}
