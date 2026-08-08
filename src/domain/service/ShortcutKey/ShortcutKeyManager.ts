import { provide } from 'inversify-binding-decorators';
import { control, IShortcutKey, IShortcutKeyManager, meta, shift } from '../../contract';
import type { FnKey } from '../../contract';
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
			if (this.isShortcutMatch(e, key)) {
				key.onKeyDown(e);
			}
		});
	};

	private onKeyUp = (e: KeyboardEvent) => {
		this.shortcutKeys.forEach((key) => {
			if (this.isShortcutMatch(e, key)) {
				key.onKeyUp(e);
			}
		});
	};

	private getFnKey(event: KeyboardEvent): FnKey {
		let fnKey = 0;
		if (event.metaKey) {
			fnKey |= meta;
		}
		if (event.ctrlKey) {
			fnKey |= control;
		}
		if (event.shiftKey) {
			fnKey |= shift;
		}
		return fnKey;
	}

	private isShortcutMatch(event: KeyboardEvent, shortcutKey: IShortcutKey): boolean {
		if (event.altKey) {
			return false;
		}

		const keys = Array.isArray(shortcutKey.key) ? shortcutKey.key : [shortcutKey.key];
		if (!keys.some((key) => key.toLowerCase() === event.key.toLowerCase())) {
			return false;
		}

		const fnKey = this.getFnKey(event);
		const fnKeyMatched =
			shortcutKey.fnKeys.length === 0 ? fnKey === 0 : shortcutKey.fnKeys.includes(fnKey);
		return fnKeyMatched && (shortcutKey.isMatch?.(event) ?? true);
	}

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
