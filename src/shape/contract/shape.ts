/**
 * 图形的类型
 */
export enum ShapeTypeEnum {
	Circle = 'circle',
	Rectangle = 'rectangle',
	RoundedRectangle = 'roundedRectangle',
	Diamond = 'diamond',
	Text = 'text',
	Line = 'line',
}

/**
 * 图形的状态
 */
export enum ShapeStateEnum {
	Normal = 'normal',
	Hover = 'hover',
	Selected = 'selected',

	/**
	 * 多选态
	 */
	MultiSelected = 'multiSelected',

	/**
	 * 文字编辑态
	 */
	Edit = 'edit',

	/**
	 * 移动中
	 */
	Moving = 'moving',

	/**
	 * 调整尺寸中
	 */
	Resizing = 'resizing',

	/**
	 * 旋转中
	 */
	Rotating = 'rotating',
}

/**
 * 图形装饰器的类型
 * exp: hover 图形的时候需要出现 hover 框
 */
export enum ShapeDecorateTypeEnum {
	HoverBorder = 'hoverBorder',
	SelectedBorder = 'selectedBorder',
}

export enum ShapePropertyEnum {
	/**
	 * 基础属性，比如：位置、尺寸等
	 */
	Base = 'base',
	Fill = 'fill',
	Stroke = 'stroke',
	Text = 'text',
	/**
	 * 连线属性，包含起终点、路由、箭头
	 */
	Line = 'line',
}

export interface BasePropertyValue {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation?: number;
}

export enum ResizeDirection {
	TL = 'TL',
	TR = 'TR',
	BR = 'BR',
	BL = 'BL',
	T = 'T',
	R = 'R',
	B = 'B',
	L = 'L',
}

export interface ShapeResizeRequest {
	origin: BasePropertyValue;
	proposed: BasePropertyValue;
	direction: ResizeDirection;
	deltaX: number;
	deltaY: number;
	minSize: number;
}

export type FillStyle = 'solid' | 'sketchy';

export interface FillPropertyValue {
	color: number;
	/**
	 * 透明度
	 */
	alpha: number;
	style?: FillStyle;
	seed?: number;
}

export type StrokeStyle = 'regular' | 'sketchy';

export interface StrokePropertyValue {
	color: number;
	width: number;
	alpha: number;
	style?: StrokeStyle;
	seed?: number;
}

export interface TextPropertyValue {
	text: string;
	color?: number;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: 'normal' | 'bold';
	horizontalAlign?: 'left' | 'center' | 'right';
	verticalAlign?: 'top' | 'middle' | 'bottom';
	lineHeight?: number;
	padding?: number;
}

/** 连线端点：可以是自由坐标，也可以锚定到某个图形 */
export interface LineEndpointValue {
	x: number;
	y: number;
	/** 锚定的图形 id，设置后连线跟随图形移动 */
	shapeId?: string;
	/** 锚点在目标图形的方向，'auto' 自动选取最近边 */
	anchor?: 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'center';
}

export type LineRoutingType = 'straight' | 'orthogonal' | 'curved';

export interface LinePropertyValue {
	start: LineEndpointValue;
	end: LineEndpointValue;
	/** 途经点，最多 2 个，世界坐标，线会平滑经过这些点 */
	midPoints?: Point[];
	routing?: LineRoutingType;
	startArrow?: boolean;
	endArrow?: boolean;
}

export interface ShapeData {
	id: string;
	type: ShapeTypeEnum;
	properties: {
		base: BasePropertyValue;
		fill?: FillPropertyValue;
		stroke?: StrokePropertyValue;
		text?: TextPropertyValue;
		line?: LinePropertyValue;
	};
}
