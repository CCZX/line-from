export interface IShortcutKeyManager {
	start(): void;
}

export const IShortcutKeyManager = Symbol('IShortcutKeyManager');

export interface IShortcutKey {
	name: string;
	key: string;
	fnKeys: string[];

	isMatch(e: KeyboardEvent): boolean;
	onKeyDown(e: KeyboardEvent): void;
	onKeyUp(e: KeyboardEvent): void;
}

export const IShortcutKey = Symbol('IShortcutKey');
