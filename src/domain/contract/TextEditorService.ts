import type { TextEditableShape } from '@lineform/shape/TextEditableShape';

export interface ITextEditorService {
	begin(shape: TextEditableShape): void;
	commit(shape: TextEditableShape): void;
	cancel(shape: TextEditableShape): void;
	close(shape: TextEditableShape): void;
}

export const ITextEditorService = Symbol('ITextEditorService');
