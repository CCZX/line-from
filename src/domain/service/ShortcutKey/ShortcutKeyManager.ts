import { provide } from 'inversify-binding-decorators';
import { IShortcutKey, IShortcutKeyManager } from '../../contract';
import { multiInject } from 'inversify';
import { IDestroyable } from '@/common/contract/Destroyable';
import { provideMultiple } from '@/common/context';

@provideMultiple(IShortcutKeyManager, IDestroyable)
export class ShortcutKeyManager implements IShortcutKeyManager, IDestroyable {
	@multiInject(IShortcutKey)
	private shortcutKeys: IShortcutKey[] = [];

	private started = false;

	private onKeyDown = (e: KeyboardEvent) => {
		this.shortcutKeys.forEach((key) => {
			if (key.isMatch(e)) {
				key.onKeyDown(e);
			}
		});
	};

	private onKeyUp = (e: KeyboardEvent) => {
		this.shortcutKeys.forEach((key) => {
			if (key.isMatch(e)) {
				key.onKeyUp(e);
			}
		});
	};

	public start() {
		if (this.started) {
			return;
		}
		this.started = true;

		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	public destroy() {
		this.started = false;
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
	}
}
