import { Graphics } from '@pixi/graphics';
import { TextMetrics, type TextStyle } from '@pixi/text';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import { DECORATE_COLORS, SHAPE_COLORS } from '@lineform/common/color';
import {
	ITextSelectionService,
	type TextCaretRect,
	type TextSelectionPointerOptions,
} from '@lineform/domain/contract/TextSelectionService';
import { IViewportService } from '@lineform/domain/contract/ViewportService';
import type { TextEditableShape } from '@lineform/shape/TextEditableShape';

const CARET_BLINK_INTERVAL = 530;
const SELECTION_ALPHA = 0.28;

const NEWLINE_CODES = new Set([10, 13]);
const BREAKING_SPACE_CODES = new Set([
	9, 32, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8200, 8201, 8202, 8287, 12288,
]);

interface SourceToken {
	text: string;
	start: number;
	end: number;
	isNewline: boolean;
}

interface SourceLine {
	start: number;
	/** 不包含换行符的源文本末尾。 */
	end: number;
	/** 硬换行时包含换行符，否则等于 end。 */
	breakEnd: number;
	visibleEnd: number;
	text: string;
}

interface LayoutLine extends SourceLine {
	index: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface EditorLayout {
	lines: LayoutLine[];
	lineHeight: number;
}

function isNewline(char: string): boolean {
	return NEWLINE_CODES.has(char.charCodeAt(0));
}

function isBreakingSpace(char: string): boolean {
	return BREAKING_SPACE_CODES.has(char.charCodeAt(0));
}

function tokenize(text: string): SourceToken[] {
	const tokens: SourceToken[] = [];
	let tokenStart = 0;
	let token = '';

	const flush = (end: number) => {
		if (!token) {
			return;
		}
		tokens.push({ text: token, start: tokenStart, end, isNewline: false });
		token = '';
	};

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (isBreakingSpace(char) || isNewline(char)) {
			flush(index);
			tokens.push({ text: char, start: index, end: index + 1, isNewline: isNewline(char) });
			tokenStart = index + 1;
			continue;
		}

		if (!token) {
			tokenStart = index;
		}
		token += char;
	}
	flush(text.length);

	return tokens;
}

function trimVisibleEnd(text: string, start: number, end: number): number {
	let visibleEnd = end;
	while (visibleEnd > start && isBreakingSpace(text[visibleEnd - 1])) {
		visibleEnd -= 1;
	}
	return visibleEnd;
}

/** 按 Pixi TextMetrics 的贪心换行规则保留每一行在原字符串中的索引范围。 */
function wrapSourceLines(text: string, style: TextStyle): SourceLine[] {
	if (!text) {
		return [{ start: 0, end: 0, breakEnd: 0, visibleEnd: 0, text: '' }];
	}

	const lines: SourceLine[] = [];
	const tokens = tokenize(text);
	const wordWrapWidth = style.wordWrapWidth + style.letterSpacing;
	let lineStart = 0;
	let lineEnd = 0;
	let lineWidth = 0;
	let canPrependSpaces = true;

	const measureToken = (value: string) => {
		const metrics = TextMetrics.measureText(value, style, false);
		return (metrics.lineWidths[0] ?? 0) + style.letterSpacing;
	};

	const pushLine = (end: number, breakEnd = end) => {
		const visibleEnd = trimVisibleEnd(text, lineStart, end);
		lines.push({
			start: lineStart,
			end,
			breakEnd,
			visibleEnd,
			text: text.slice(lineStart, visibleEnd),
		});
		lineStart = breakEnd;
		lineEnd = breakEnd;
		lineWidth = 0;
	};

	for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
		const token = tokens[tokenIndex];
		if (token.isNewline) {
			pushLine(token.start, token.end);
			canPrependSpaces = true;
			continue;
		}

		const tokenWidth = measureToken(token.text);
		if (style.wordWrap && tokenWidth > wordWrapWidth) {
			if (lineEnd > lineStart) {
				pushLine(token.start);
			}

			if (TextMetrics.canBreakWords(token.text, style.breakWords)) {
				let sourceIndex = token.start;
				for (const grapheme of TextMetrics.graphemeSegmenter(token.text)) {
					const graphemeEnd = sourceIndex + grapheme.length;
					const graphemeWidth = measureToken(grapheme);
					if (lineEnd > lineStart && graphemeWidth + lineWidth > wordWrapWidth) {
						pushLine(sourceIndex);
					}
					lineEnd = graphemeEnd;
					lineWidth += graphemeWidth;
					sourceIndex = graphemeEnd;
				}
				canPrependSpaces = false;
				continue;
			}

			lineStart = token.start;
			lineEnd = token.end;
			lineWidth = tokenWidth;
			if (tokenIndex < tokens.length - 1) {
				pushLine(token.end);
			}
			canPrependSpaces = false;
			continue;
		}

		if (style.wordWrap && tokenWidth + lineWidth > wordWrapWidth) {
			pushLine(token.start);
			canPrependSpaces = false;
		}
		if (lineEnd === lineStart && isBreakingSpace(token.text) && !canPrependSpaces) {
			// Pixi 会丢弃软换行后的行首空格，但 selection 索引仍需跨过该源字符。
			lineStart = token.end;
			lineEnd = token.end;
			continue;
		}
		lineEnd = token.end;
		lineWidth += tokenWidth;
	}

	pushLine(lineEnd);
	return lines;
}

@provide(ITextSelectionService)
export class TextSelectionService implements ITextSelectionService {
	@inject(IViewportService)
	private viewportService!: IViewportService;

	private readonly selectionView = new Graphics();
	private readonly caretView = new Graphics();
	private activeShape: TextEditableShape | null = null;
	private input: HTMLTextAreaElement | null = null;
	private layout: EditorLayout | null = null;
	private onSelectionChange: (() => void) | null = null;
	private dragAnchor: number | null = null;
	private preferredCaretX: number | null = null;
	private caretLineHint: { offset: number; line: number } | null = null;
	private blinkTimer: ReturnType<typeof setInterval> | null = null;
	private caretVisible = true;

	public begin(
		shape: TextEditableShape,
		input: HTMLTextAreaElement,
		onSelectionChange?: () => void,
	): void {
		this.end();
		this.activeShape = shape;
		this.input = input;
		this.onSelectionChange = onSelectionChange ?? null;

		const textIndex = shape.container.getChildIndex(shape.textView);
		shape.container.addChildAt(this.selectionView, Math.max(0, textIndex));
		shape.container.addChild(this.caretView);
		this.selectionView.visible = true;
		this.caretView.visible = true;
		this.restartCaretBlink();
		this.refresh();
	}

	public end(): void {
		this.stopCaretBlink();
		this.selectionView.parent?.removeChild(this.selectionView);
		this.caretView.parent?.removeChild(this.caretView);
		this.selectionView.clear();
		this.caretView.clear();
		this.activeShape = null;
		this.input = null;
		this.layout = null;
		this.onSelectionChange = null;
		this.dragAnchor = null;
		this.preferredCaretX = null;
		this.caretLineHint = null;
	}

	public isActive(shape?: TextEditableShape): boolean {
		return !!this.activeShape && (!shape || this.activeShape === shape);
	}

	public refresh(): void {
		if (!this.activeShape || !this.input) {
			return;
		}

		this.layout = this.createLayout(this.activeShape, this.input.value);
		this.drawSelection();
		this.drawCaret();
		this.showCaret();
		this.onSelectionChange?.();
	}

	public pointerDown(
		shape: TextEditableShape,
		point: Point,
		options: TextSelectionPointerOptions = {},
	): boolean {
		if (!this.isActive(shape) || !this.input || !this.layout) {
			return false;
		}

		this.input.focus({ preventScroll: true });
		const hit = this.indexFromPoint(point);
		this.caretLineHint = { offset: hit.offset, line: hit.line };
		this.preferredCaretX = null;

		if (options.selectLine) {
			const line = this.layout.lines[hit.line];
			this.setSelection(line.start, line.breakEnd);
			this.dragAnchor = line.start;
			return true;
		}

		if (options.selectWord) {
			const word = this.getWordRange(hit.offset);
			this.setSelection(word.start, word.end);
			this.dragAnchor = word.start;
			return true;
		}

		if (options.extend) {
			const { anchor } = this.getAnchorAndFocus();
			this.setSelection(anchor, hit.offset);
			this.dragAnchor = anchor;
			return true;
		}

		this.setSelection(hit.offset, hit.offset);
		this.dragAnchor = hit.offset;
		return true;
	}

	public pointerMove(shape: TextEditableShape, point: Point): boolean {
		if (!this.isActive(shape) || this.dragAnchor === null || !this.layout) {
			return false;
		}

		const hit = this.indexFromPoint(point);
		this.caretLineHint = { offset: hit.offset, line: hit.line };
		this.setSelection(this.dragAnchor, hit.offset);
		return true;
	}

	public pointerUp(): boolean {
		const wasDragging = this.dragAnchor !== null;
		this.dragAnchor = null;
		return wasDragging;
	}

	public handleKeyDown(event: KeyboardEvent): boolean {
		if (!this.input || !this.layout || event.altKey || event.ctrlKey || event.metaKey) {
			this.preferredCaretX = null;
			return false;
		}

		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			const direction = event.key === 'ArrowUp' ? -1 : 1;
			this.moveVertically(direction, event.shiftKey);
			return true;
		}

		if (event.key === 'Home' || event.key === 'End') {
			this.moveToLineEdge(event.key === 'Home', event.shiftKey);
			return true;
		}

		this.preferredCaretX = null;
		this.caretLineHint = null;
		return false;
	}

	public getCaretRect(): TextCaretRect | null {
		if (!this.input || !this.layout) {
			return null;
		}

		const { focus } = this.getAnchorAndFocus();
		const caret = this.caretFromIndex(focus);
		return { x: caret.x, y: caret.line.y, height: caret.line.height };
	}

	private createLayout(shape: TextEditableShape, text: string): EditorLayout {
		const style = shape.textView.style;
		const metrics = TextMetrics.measureText(text, style, style.wordWrap);
		const sourceLines = wrapSourceLines(text, style);
		const viewWidth = text ? shape.textView.width : 0;
		const viewHeight = shape.textView.height;
		const blockX = shape.textView.x - shape.textView.anchor.x * viewWidth;
		const blockY = shape.textView.y - shape.textView.anchor.y * viewHeight;
		const strokeOffset = style.strokeThickness / 2;

		const lines = sourceLines.map((line, index): LayoutLine => {
			const width = TextMetrics.measureText(line.text, style, false).lineWidths[0] ?? 0;
			const alignOffset =
				style.align === 'right'
					? metrics.maxLineWidth - width
					: style.align === 'center'
					? (metrics.maxLineWidth - width) / 2
					: 0;
			return {
				...line,
				index,
				x: blockX + strokeOffset + alignOffset,
				y: blockY + index * metrics.lineHeight,
				width,
				height: metrics.lineHeight,
			};
		});

		return { lines, lineHeight: metrics.lineHeight };
	}

	private drawSelection(): void {
		this.selectionView.clear();
		if (!this.input || !this.layout) {
			return;
		}

		const start = this.input.selectionStart ?? 0;
		const end = this.input.selectionEnd ?? start;
		if (start === end) {
			return;
		}

		const minimumWidth = this.getCaretWidth();
		this.selectionView.beginFill(DECORATE_COLORS.selection, SELECTION_ALPHA);
		for (const line of this.layout.lines) {
			const rangeStart = Math.max(start, line.start);
			const rangeEnd = Math.min(end, line.end);
			const selectsBreak = start < line.breakEnd && end > line.end;
			if (rangeStart >= rangeEnd && !selectsBreak) {
				continue;
			}

			const x1 = this.xForOffset(line, rangeStart);
			const x2 = this.xForOffset(line, Math.max(rangeStart, rangeEnd));
			const width = Math.max(selectsBreak ? minimumWidth : 0, x2 - x1);
			this.selectionView.drawRect(x1, line.y, width, line.height);
		}
		this.selectionView.endFill();
	}

	private drawCaret(): void {
		this.caretView.clear();
		if (!this.input || !this.layout) {
			return;
		}

		const { focus } = this.getAnchorAndFocus();
		const caret = this.caretFromIndex(focus);
		const color = this.activeShape?.getTextValue().color ?? SHAPE_COLORS.text.default;
		this.caretView.beginFill(color);
		this.caretView.drawRect(caret.x, caret.line.y, this.getCaretWidth(), caret.line.height);
		this.caretView.endFill();
	}

	private getCaretWidth(): number {
		const scale = this.viewportService?.store?.getState().scale ?? 1;
		return Math.max(0.75, 1.5 / Math.max(scale, 0.01));
	}

	private indexFromPoint(point: Point): { offset: number; line: number } {
		const lines = this.layout!.lines;
		const firstY = lines[0]?.y ?? 0;
		const lineIndex = Math.max(
			0,
			Math.min(lines.length - 1, Math.floor((point.y - firstY) / this.layout!.lineHeight)),
		);
		const line = lines[lineIndex];
		const boundaries = this.getLineBoundaries(line);
		let nearest = boundaries[0];
		let nearestDistance = Number.POSITIVE_INFINITY;

		for (const offset of boundaries) {
			const x = this.xForOffset(line, offset);
			const distance = Math.abs(point.x - x);
			if (distance < nearestDistance) {
				nearest = offset;
				nearestDistance = distance;
			}
		}

		return { offset: nearest, line: lineIndex };
	}

	private getLineBoundaries(line: LayoutLine): number[] {
		const boundaries = [line.start];
		let offset = line.start;
		const source = this.input!.value.slice(line.start, line.visibleEnd);
		for (const grapheme of TextMetrics.graphemeSegmenter(source)) {
			offset += grapheme.length;
			boundaries.push(offset);
		}
		if (boundaries[boundaries.length - 1] !== line.end) {
			boundaries.push(line.end);
		}
		return boundaries;
	}

	private xForOffset(line: LayoutLine, offset: number): number {
		const visibleOffset = Math.max(line.start, Math.min(line.visibleEnd, offset));
		const prefix = this.input!.value.slice(line.start, visibleOffset);
		const width = TextMetrics.measureText(prefix, this.activeShape!.textView.style, false)
			.lineWidths[0];
		return line.x + (width ?? 0);
	}

	private caretFromIndex(index: number): { x: number; line: LayoutLine } {
		const lines = this.layout!.lines;
		let line = lines[lines.length - 1];
		const hintedLine = this.caretLineHint?.offset === index ? lines[this.caretLineHint.line] : null;
		if (hintedLine && index >= hintedLine.start && index <= hintedLine.breakEnd) {
			line = hintedLine;
		} else {
			for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
				if (index >= lines[lineIndex].start) {
					line = lines[lineIndex];
					break;
				}
			}
		}
		return { x: this.xForOffset(line, index), line };
	}

	private moveVertically(direction: -1 | 1, extend: boolean): void {
		const { anchor, focus } = this.getAnchorAndFocus();
		const caret = this.caretFromIndex(focus);
		this.preferredCaretX ??= caret.x;
		const targetLineIndex = Math.max(
			0,
			Math.min(this.layout!.lines.length - 1, caret.line.index + direction),
		);
		const targetLine = this.layout!.lines[targetLineIndex];
		const hit = this.indexFromPoint({
			x: this.preferredCaretX,
			y: targetLine.y + targetLine.height / 2,
		});
		this.caretLineHint = { offset: hit.offset, line: hit.line };
		this.setSelection(extend ? anchor : hit.offset, hit.offset);
	}

	private moveToLineEdge(toStart: boolean, extend: boolean): void {
		const { anchor, focus } = this.getAnchorAndFocus();
		const caret = this.caretFromIndex(focus);
		const target = toStart ? caret.line.start : caret.line.end;
		this.preferredCaretX = null;
		this.caretLineHint = { offset: target, line: caret.line.index };
		this.setSelection(extend ? anchor : target, target);
	}

	private getAnchorAndFocus(): { anchor: number; focus: number } {
		const start = this.input?.selectionStart ?? 0;
		const end = this.input?.selectionEnd ?? start;
		return this.input?.selectionDirection === 'backward'
			? { anchor: end, focus: start }
			: { anchor: start, focus: end };
	}

	private setSelection(anchor: number, focus: number): void {
		if (!this.input) {
			return;
		}
		const start = Math.min(anchor, focus);
		const end = Math.max(anchor, focus);
		const direction: 'forward' | 'backward' = focus < anchor ? 'backward' : 'forward';
		this.input.setSelectionRange(start, end, direction);
		this.refresh();
	}

	private getWordRange(offset: number): { start: number; end: number } {
		const text = this.input?.value ?? '';
		if (!text) {
			return { start: 0, end: 0 };
		}

		const target = Math.min(offset, Math.max(0, text.length - 1));
		if (typeof Intl.Segmenter === 'function') {
			const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
			for (const segment of segmenter.segment(text)) {
				const end = segment.index + segment.segment.length;
				if (target >= segment.index && target < end) {
					return { start: segment.index, end };
				}
			}
		}

		const isWordCharacter = (char: string) => /[\p{L}\p{N}_]/u.test(char);
		const wordCharacter = isWordCharacter(text[target]);
		let start = target;
		let end = target + 1;
		while (start > 0 && isWordCharacter(text[start - 1]) === wordCharacter) {
			start -= 1;
		}
		while (end < text.length && isWordCharacter(text[end]) === wordCharacter) {
			end += 1;
		}
		return { start, end };
	}

	private restartCaretBlink(): void {
		this.stopCaretBlink();
		this.blinkTimer = setInterval(() => {
			this.caretVisible = !this.caretVisible;
			this.caretView.visible = this.caretVisible;
		}, CARET_BLINK_INTERVAL);
	}

	private stopCaretBlink(): void {
		if (this.blinkTimer) {
			clearInterval(this.blinkTimer);
			this.blinkTimer = null;
		}
	}

	private showCaret(): void {
		this.caretVisible = true;
		this.caretView.visible = true;
	}
}
