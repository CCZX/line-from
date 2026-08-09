import { BaseShape } from '@/shape/BaseShape';

export enum EventModeEnum {
	InteractionMode = 'interactionMode',
	CreatorMode = 'creatorMode',
}

export enum HandlerEnum {
	Resize = 'resize',
	Rotate = 'rotate',
	Move = 'move',
	Select = 'select',
	Hover = 'hover',
	Marquee = 'marquee',
	TextEdit = 'textEdit',
	LineEdit = 'lineEdit',
	ConnectionCreate = 'connectionCreate',
}

/**
 * 跨 handler 共享的可变状态
 */
export interface InteractionState {
	hoveredShape: BaseShape | null;
}

/**
 * EventManager 每次事件预计算的外部数据，handler 只读
 */
export interface EventPayload {
	viewportPoint: Point;
	screenPoint: Point;
	scale: number;
}
