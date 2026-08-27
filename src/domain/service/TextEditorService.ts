import { Point } from '@pixi/core';
import { inject } from 'inversify';
import { IocContainerService } from '@/common/contract';
import {
	IActionManager,
	ITextEditorService,
	ITextSelectionService,
	IViewportService,
} from '@/domain/contract';
import { UpdatePropsAction } from './Action/Actions/UpdatePropsAction';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { TextProperty } from '@/shape/property/TextProperty';
import { ShapePropertyEnum, ShapeStateEnum, TextPropertyValue } from '@/shape/contract';
import type { TextEditableShape } from '@/shape/TextEditableShape';
import { provide } from 'inversify-binding-decorators';
import i18n from '@/i18n';

@provide(ITextEditorService)
export class TextEditorService implements ITextEditorService {
	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(ITextSelectionService)
	private selectionService!: ITextSelectionService;

	private textarea: HTMLTextAreaElement | null = null;
	private activeShape: TextEditableShape | null = null;
	private originalValue: TextPropertyValue | null = null;
	private unsubscribeViewport: (() => void) | null = null;

	public begin(shape: TextEditableShape): void {
		const textarea = this.getTextarea();

		if (this.activeShape && this.activeShape !== shape) {
			this.cancel(this.activeShape);
		}

		this.activeShape = shape;
		this.originalValue = { ...shape.getTextValue() };

		textarea.value = this.originalValue.text;
		this.applyTextStyle(shape);
		textarea.style.display = 'block';
		textarea.setSelectionRange(textarea.value.length, textarea.value.length);
		this.selectionService.begin(shape, textarea, this.syncEditorPosition);
		this.syncEditorPosition();

		this.unsubscribeViewport?.();
		this.unsubscribeViewport = this.viewportService.store.subscribe(this.syncEditorPosition);
		window.addEventListener('resize', this.syncEditorPosition);

		requestAnimationFrame(() => {
			if (this.activeShape === shape) {
				this.syncEditorPosition();
				textarea.focus({ preventScroll: true });
			}
		});
	}

	public commit(shape: TextEditableShape): void {
		if (this.activeShape !== shape || !this.textarea || !this.originalValue) {
			return;
		}

		const originalValue = this.originalValue;
		const nextValue: TextPropertyValue = {
			...originalValue,
			text: this.textarea.value,
		};
		const changed = nextValue.text !== originalValue.text;

		this.teardown();

		if (!changed) {
			shape.getProperty<TextProperty>(ShapePropertyEnum.Text).draw();
			return;
		}

		// 编辑过程中会实时更新 Pixi。提交前先恢复旧值，确保 Action 能生成正确的撤销数据。
		shape.getProperty<TextProperty>(ShapePropertyEnum.Text).set({ ...originalValue });
		const base = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).value;
		this.actionManager.push(
			new UpdatePropsAction(
				[
					{
						id: shape.id,
						type: shape.type,
						properties: {
							base: { ...base },
							text: nextValue,
						},
					},
				],
				this.ioc,
			),
		);
	}

	public cancel(shape: TextEditableShape): void {
		if (this.activeShape !== shape) {
			return;
		}

		const originalValue = this.originalValue;
		this.teardown();
		if (originalValue) {
			shape.getProperty<TextProperty>(ShapePropertyEnum.Text).set({ ...originalValue });
		}
	}

	public close(shape: TextEditableShape): void {
		if (this.activeShape === shape) {
			this.teardown();
		}
	}

	private getTextarea(): HTMLTextAreaElement {
		if (this.textarea) {
			return this.textarea;
		}

		const textarea = document.createElement('textarea');
		textarea.setAttribute('aria-label', i18n.t('editor.editText'));
		textarea.spellcheck = false;
		textarea.wrap = 'off';

		Object.assign(textarea.style, {
			position: 'fixed',
			zIndex: '99999',
			left: '0',
			top: '0',
			display: 'none',
			width: '1px',
			height: '1px',
			boxSizing: 'border-box',
			margin: '0',
			padding: '0',
			border: 'none',
			outline: 'none',
			resize: 'none',
			overflow: 'hidden',
			background: 'transparent',
			color: 'transparent',
			caretColor: 'transparent',
			opacity: '0',
			pointerEvents: 'none',
		});

		textarea.addEventListener('keydown', this.onKeyDown);
		textarea.addEventListener('input', this.onInput);
		textarea.addEventListener('select', this.onSelectionChange);
		textarea.addEventListener('keyup', this.onSelectionChange);
		textarea.addEventListener('compositionend', this.onSelectionChange);
		textarea.addEventListener('blur', this.onBlur);
		textarea.addEventListener('wheel', this.onWheel, { passive: false });
		document.body.appendChild(textarea);
		i18n.on('languageChanged', () => {
			textarea.setAttribute('aria-label', i18n.t('editor.editText'));
		});

		this.textarea = textarea;
		return textarea;
	}

	private applyTextStyle(shape: TextEditableShape): void {
		if (!this.textarea) {
			return;
		}

		const value = shape.getTextValue();

		// iOS 会放大字号小于 16px 的输入框；元素不可见，保持 16px 下限即可避免页面缩放。
		this.textarea.style.fontSize = `${Math.max(16, value.fontSize ?? 16)}px`;
		this.textarea.style.fontFamily =
			value.fontFamily ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
		this.textarea.style.fontWeight = value.fontWeight ?? 'normal';
		this.textarea.style.lineHeight = '1';
	}

	private syncEditorPosition = (): void => {
		if (!this.textarea || !this.activeShape) {
			return;
		}

		const shape = this.activeShape;
		const caret = this.selectionService.getCaretRect();
		if (!caret) {
			return;
		}

		const origin = shape.container.toGlobal(new Point(caret.x, caret.y));
		const bottom = shape.container.toGlobal(new Point(caret.x, caret.y + caret.height));
		const canvasRect = this.viewportService
			.getStage()
			.getViewport()
			.canvasEl.getBoundingClientRect();

		this.textarea.style.left = `${canvasRect.left + origin.x}px`;
		this.textarea.style.top = `${canvasRect.top + origin.y}px`;
		this.textarea.style.width = '1px';
		this.textarea.style.height = `${Math.max(
			1,
			Math.hypot(bottom.x - origin.x, bottom.y - origin.y),
		)}px`;
	};

	private onInput = (): void => {
		if (!this.textarea || !this.activeShape) {
			return;
		}

		this.activeShape
			.getProperty<TextProperty>(ShapePropertyEnum.Text)
			.update({ text: this.textarea.value });
		this.selectionService.refresh();
	};

	private onSelectionChange = (): void => {
		if (!this.activeShape) {
			return;
		}
		this.selectionService.refresh();
	};

	private onKeyDown = (event: KeyboardEvent): void => {
		event.stopPropagation();

		if (event.isComposing || !this.activeShape) {
			return;
		}

		const shape = this.activeShape;
		if (event.key === 'Escape') {
			event.preventDefault();
			this.cancel(shape);
			shape.setState(ShapeStateEnum.Selected);
			return;
		}

		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			shape.setState(ShapeStateEnum.Selected);
			return;
		}

		if (this.selectionService.handleKeyDown(event)) {
			event.preventDefault();
		}
	};

	private onBlur = (): void => {
		const shape = this.activeShape;
		if (shape?.getState() === ShapeStateEnum.Edit) {
			shape.setState(ShapeStateEnum.Selected);
		}
	};

	private onWheel = (event: WheelEvent): void => {
		// textarea 覆盖在 canvas 上时，滚轮事件不会到达 Viewport；阻止浏览器滚动或缩放页面。
		event.preventDefault();
	};

	private teardown(): void {
		this.selectionService.end();
		this.activeShape = null;
		this.originalValue = null;
		this.unsubscribeViewport?.();
		this.unsubscribeViewport = null;
		window.removeEventListener('resize', this.syncEditorPosition);

		if (this.textarea) {
			this.textarea.style.display = 'none';
		}
	}
}
