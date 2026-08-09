import { Container } from '@pixi/display';
import { Graphics } from '@pixi/graphics';
import { Text as PixiText } from '@pixi/text';
import { ITextEditorService } from '@/domain/contract';
import { BaseShape } from './BaseShape';
import { ShapeContext, ShapePropertyEnum, ShapeTypeEnum, TextPropertyValue } from './contract';
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
		const value = this.getProperty<TextProperty>(ShapePropertyEnum.Text)?.value;
		const padding = Math.max(0, value?.padding ?? DEFAULT_PADDING);

		if (this.type === ShapeTypeEnum.Text) {
			return { x: 0, y: 0, width, height };
		}

		if (this.type === ShapeTypeEnum.Circle) {
			const side = Math.max(0, Math.min(width, height) / Math.sqrt(2) - padding * 2);
			return {
				x: (width - side) / 2,
				y: (height - side) / 2,
				width: side,
				height: side,
			};
		}

		return {
			x: padding,
			y: padding,
			width: Math.max(0, width - padding * 2),
			height: Math.max(0, height - padding * 2),
		};
	}

	public layoutText(): void {
		if (!this.textView) {
			return;
		}

		const value = this.getProperty<TextProperty>(ShapePropertyEnum.Text)?.value;
		const bounds = this.getTextLayoutBounds();
		const isStandaloneText = this.type === ShapeTypeEnum.Text;
		const horizontalAlign = value?.horizontalAlign ?? (isStandaloneText ? 'left' : 'center');
		const verticalAlign = value?.verticalAlign ?? (isStandaloneText ? 'top' : 'middle');

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

		if (this.type === ShapeTypeEnum.Text || !this.textView.text) {
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

	public showTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).begin(this);
	}

	public hideTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).close(this);
	}

	public commitTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).commit(this);
	}

	public cancelTextInput(): void {
		this.context.ioc.get<ITextEditorService>(ITextEditorService).cancel(this);
	}

	public getTextValue(): TextPropertyValue {
		return this.getProperty<TextProperty>(ShapePropertyEnum.Text).value;
	}
}
