import type { FnKey } from './common';

export interface IShortcutKeyManager {
	start(): void;
}

export const IShortcutKeyManager = Symbol('IShortcutKeyManager');

export interface IShortcutKey {
	name: string;
	key: string | string[];
	/** 每一项表示一种允许的功能键位组合；空数组表示不需要功能键。 */
	fnKeys: FnKey[];

	/** 通用键盘匹配通过后执行的可选业务条件。 */
	isMatch?(e: KeyboardEvent): boolean;
	onKeyDown(e: KeyboardEvent): void;
	onKeyUp(e: KeyboardEvent): void;
}

export const IShortcutKey = Symbol('IShortcutKey');
