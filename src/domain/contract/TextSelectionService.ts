import type { TextEditableShape } from '@/shape/TextEditableShape';

export interface TextCaretRect {
	x: number;
	y: number;
	height: number;
}

export interface TextSelectionPointerOptions {
	extend?: boolean;
	selectWord?: boolean;
	selectLine?: boolean;
}

/**
 * Pixi 文字编辑态的光标与选区服务。
 *
 * textarea 仅保存原生 selection 和接收输入；可见光标、选区及命中定位均由该服务负责。
 */
export interface ITextSelectionService {
	begin(shape: TextEditableShape, input: HTMLTextAreaElement, onSelectionChange?: () => void): void;
	end(): void;
	refresh(): void;
	isActive(shape?: TextEditableShape): boolean;
	pointerDown(
		shape: TextEditableShape,
		point: Point,
		options?: TextSelectionPointerOptions,
	): boolean;
	pointerMove(shape: TextEditableShape, point: Point): boolean;
	pointerUp(): boolean;
	handleKeyDown(event: KeyboardEvent): boolean;
	getCaretRect(): TextCaretRect | null;
}

export const ITextSelectionService = Symbol('ITextSelectionService');
