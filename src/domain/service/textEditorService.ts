import { Point, TextMetrics } from 'pixi.js';
import { inject } from 'inversify';
import { IocContainerService } from '@/common/contract';
import { IActionManager, ITextEditorService, IViewportService } from '@/domain/contract';
import { UpdatePropsAction } from './action/Actions/UpdatePropsAction';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { TextProperty } from '@/shape/property/TextProperty';
import {
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
	TextPropertyValue,
} from '@/shape/contract';
import type { TextEditableShape } from '@/shape/TextEditableShape';
import { provide } from 'inversify-binding-decorators';

function numberToHex(color: number): string {
	return `#${color.toString(16).padStart(6, '0')}`;
}

@provide(ITextEditorService)
export class TextEditorService implements ITextEditorService {
	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

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
		this.syncEditorPosition();
		shape.textView.visible = false;

		this.unsubscribeViewport?.();
		this.unsubscribeViewport = this.viewportService.store.subscribe(this.syncEditorPosition);
		window.addEventListener('resize', this.syncEditorPosition);

		requestAnimationFrame(() => {
			if (this.activeShape === shape) {
				this.syncEditorPosition();
				textarea.focus();
				textarea.setSelectionRange(textarea.value.length, textarea.value.length);
			}
		});
	}

	public commit(shape: TextEditableShape): void {
		if (this.activeShape !== shape || !this.textarea || !this.originalValue) {
			return;
		}

		const nextValue: TextPropertyValue = {
			...this.originalValue,
			text: this.textarea.value,
		};
		const changed = nextValue.text !== this.originalValue.text;

		this.teardown(shape);

		if (!changed) {
			shape.getProperty<TextProperty>(ShapePropertyEnum.Text).draw();
			return;
		}

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

		this.teardown(shape);
		shape.getProperty<TextProperty>(ShapePropertyEnum.Text).draw();
	}

	public close(shape: TextEditableShape): void {
		if (this.activeShape === shape) {
			this.teardown(shape);
		}
	}

	private getTextarea(): HTMLTextAreaElement {
		if (this.textarea) {
			return this.textarea;
		}

		const textarea = document.createElement('textarea');
		textarea.setAttribute('aria-label', '编辑图形文字');
		textarea.spellcheck = false;
		textarea.wrap = 'soft';

		Object.assign(textarea.style, {
			position: 'fixed',
			zIndex: '99999',
			left: '0',
			top: '0',
			display: 'none',
			boxSizing: 'border-box',
			margin: '0',
			padding: '0',
			border: 'none',
			outline: 'none',
			resize: 'none',
			overflow: 'hidden',
			background: 'transparent',
			transformOrigin: '0 0',
		});

		textarea.addEventListener('keydown', this.onKeyDown);
		textarea.addEventListener('input', this.syncEditorPosition);
		textarea.addEventListener('blur', this.onBlur);
		document.body.appendChild(textarea);

		this.textarea = textarea;
		return textarea;
	}

	private applyTextStyle(shape: TextEditableShape): void {
		if (!this.textarea) {
			return;
		}

		const value = shape.getTextValue();
		const isStandaloneText = shape.type === ShapeTypeEnum.Text;
		const horizontalAlign = value.horizontalAlign ?? (isStandaloneText ? 'left' : 'center');

		this.textarea.style.color = numberToHex(value.color ?? 0x1e1e1e);
		this.textarea.style.caretColor = numberToHex(value.color ?? 0x1e1e1e);
		this.textarea.style.fontSize = `${value.fontSize ?? 16}px`;
		this.textarea.style.fontFamily =
			value.fontFamily ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
		this.textarea.style.fontWeight = value.fontWeight ?? 'normal';
		const metrics = TextMetrics.measureText(
			value.text || ' ',
			shape.textView.style,
			shape.textView.style.wordWrap,
		);
		this.textarea.style.lineHeight = `${metrics.lineHeight}px`;
		this.textarea.style.textAlign = horizontalAlign;
	}

	private syncEditorPosition = (): void => {
		if (!this.textarea || !this.activeShape) {
			return;
		}

		const shape = this.activeShape;
		const bounds = shape.getTextLayoutBounds();
		const value = shape.getTextValue();
		const isStandaloneText = shape.type === ShapeTypeEnum.Text;
		const verticalAlign = value.verticalAlign ?? (isStandaloneText ? 'top' : 'middle');
		const metrics = TextMetrics.measureText(
			this.textarea.value || ' ',
			shape.textView.style,
			shape.textView.style.wordWrap,
		);
		const remainingHeight = Math.max(0, bounds.height - metrics.height);
		const paddingTop =
			verticalAlign === 'top'
				? 0
				: verticalAlign === 'bottom'
				? remainingHeight
				: remainingHeight / 2;
		const paddingBottom = remainingHeight - paddingTop;
		const origin = shape.container.toGlobal(new Point(bounds.x, bounds.y));
		const xUnit = shape.container.toGlobal(new Point(bounds.x + 1, bounds.y));
		const yUnit = shape.container.toGlobal(new Point(bounds.x, bounds.y + 1));
		const canvasRect = this.viewportService
			.getStage()
			.getViewport()
			.canvasEl.getBoundingClientRect();

		const a = xUnit.x - origin.x;
		const b = xUnit.y - origin.y;
		const c = yUnit.x - origin.x;
		const d = yUnit.y - origin.y;
		const tx = canvasRect.left + origin.x;
		const ty = canvasRect.top + origin.y;

		this.textarea.style.width = `${bounds.width}px`;
		this.textarea.style.height = `${bounds.height}px`;
		this.textarea.style.paddingTop = `${paddingTop}px`;
		this.textarea.style.paddingBottom = `${paddingBottom}px`;
		this.textarea.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`;
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
		}
	};

	private onBlur = (): void => {
		const shape = this.activeShape;
		if (shape?.getState() === ShapeStateEnum.Edit) {
			shape.setState(ShapeStateEnum.Selected);
		}
	};

	private teardown(shape: TextEditableShape): void {
		shape.textView.visible = true;
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
