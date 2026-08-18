import { Container } from '@pixi/display';
import { Graphics } from '@pixi/graphics';
import { Text as PixiText, TextStyle } from '@pixi/text';
import { ITextEditorService } from '@/domain/contract';
import { BaseShape } from './BaseShape';
import { ShapeContext, ShapePropertyEnum, TextPropertyValue } from './contract';
import { FillProperty } from './property/FillProperty';
import { TextProperty } from './property/TextProperty';
import { SHAPE_COLORS } from '@/common/color';

const DEFAULT_PADDING = 8;
const TEXT_BACKGROUND_PADDING = 2;
const TEXT_BACKGROUND_COLOR = SHAPE_COLORS.text.background;

export interface TextLayoutBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export abstract class TextEditableShape<T extends Container = Container> extends BaseShape<T> {
	/** 非纯色填充时隔开文字和填充线条的净空层。 */
	public readonly textBackgroundView = new Graphics();
	public readonly textView: PixiText;

	constructor(id: string, graphics: T, context: ShapeContext, textView = new PixiText()) {
		super(id, graphics, context);

		this.textView = textView;
		this.textView.resolution = Math.max(2, window.devicePixelRatio);

		if ((textView as Container) !== graphics) {
			this.container.addChild(this.textBackgroundView, textView);
		}

		this.propertyMap.set(ShapePropertyEnum.Text, new TextProperty(this));
	}

	public getTextLayoutBounds(): TextLayoutBounds {
		const { width, height } = this.getWH();
		const padding = this.getTextPadding();

		return {
			x: padding,
			y: padding,
			width: Math.max(0, width - padding * 2),
			height: Math.max(0, height - padding * 2),
		};
	}

	protected getTextPadding(): number {
		const value = this.getProperty<TextProperty>(ShapePropertyEnum.Text)?.value;
		return Math.max(0, value?.padding ?? DEFAULT_PADDING);
	}

	protected getDefaultHorizontalAlign(): NonNullable<TextPropertyValue['horizontalAlign']> {
		return 'center';
	}

	protected getDefaultVerticalAlign(): NonNullable<TextPropertyValue['verticalAlign']> {
		return 'middle';
	}

	public getTextHorizontalAlign(): NonNullable<TextPropertyValue['horizontalAlign']> {
		return this.getTextValue().horizontalAlign ?? this.getDefaultHorizontalAlign();
	}

	public getTextVerticalAlign(): NonNullable<TextPropertyValue['verticalAlign']> {
		return this.getTextValue().verticalAlign ?? this.getDefaultVerticalAlign();
	}

	protected shouldDrawTextBackground(): boolean {
		return true;
	}

	protected override drawShape(): void {
		if (!this.textView) {
			return;
		}

		const value = this.getProperty<TextProperty>(ShapePropertyEnum.Text)?.value;
		if (!value) {
			return;
		}

		const horizontalAlign = this.getTextHorizontalAlign();
		this.textView.text = value.text;
		this.textView.style = new TextStyle({
			fill: value.color ?? SHAPE_COLORS.text.default,
			fontSize: value.fontSize ?? 16,
			fontFamily:
				value.fontFamily ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
			fontWeight: value.fontWeight ?? 'normal',
			lineHeight: value.lineHeight,
			align: horizontalAlign,
			wordWrap: true,
		});
	}

	public override layoutText(): void {
		if (!this.textView) {
			return;
		}

		const value = this.getProperty<TextProperty>(ShapePropertyEnum.Text)?.value;
		const bounds = this.getTextLayoutBounds();
		const horizontalAlign = this.getTextHorizontalAlign();
		const verticalAlign = this.getTextVerticalAlign();

		const anchorX = horizontalAlign === 'left' ? 0 : horizontalAlign === 'right' ? 1 : 0.5;
		const anchorY = verticalAlign === 'top' ? 0 : verticalAlign === 'bottom' ? 1 : 0.5;

		const x =
			horizontalAlign === 'left'
				? bounds.x
				: horizontalAlign === 'right'
				? bounds.x + bounds.width
				: bounds.x + bounds.width / 2;
		const y =
			verticalAlign === 'top'
				? bounds.y
				: verticalAlign === 'bottom'
				? bounds.y + bounds.height
				: bounds.y + bounds.height / 2;

		this.textView.anchor.set(anchorX, anchorY);
		this.textView.position.set(x, y);
		this.textView.style.wordWrap = true;
		this.textView.style.wordWrapWidth = bounds.width;
		this.textView.style.align = horizontalAlign;
		this.layoutTextBackground();
	}

	private layoutTextBackground(): void {
		const background = this.textBackgroundView;
		background.clear();

		if (!this.shouldDrawTextBackground() || !this.textView.text) {
			return;
		}

		const fill = this.getProperty<FillProperty>(ShapePropertyEnum.Fill)?.value;
		if (!fill || (fill.style ?? 'solid') === 'solid' || fill.alpha <= 0) {
			return;
		}

		const width = this.textView.width;
		const height = this.textView.height;
		if (width <= 0 || height <= 0) {
			return;
		}

		const x = this.textView.x - this.textView.anchor.x * width - TEXT_BACKGROUND_PADDING;
		const y = this.textView.y - this.textView.anchor.y * height - TEXT_BACKGROUND_PADDING;

		background.beginFill(TEXT_BACKGROUND_COLOR);
		background.drawRect(
			x,
			y,
			width + TEXT_BACKGROUND_PADDING * 2,
			height + TEXT_BACKGROUND_PADDING * 2,
		);
		background.endFill();
	}

	public override showTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).begin(this);
	}

	public override hideTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).close(this);
	}

	public override commitTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).commit(this);
	}

	public cancelTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).cancel(this);
	}

	public getTextValue(): TextPropertyValue {
		return this.getProperty<TextProperty>(ShapePropertyEnum.Text).value;
	}
}
