import { EventModeEnum, EventPayload, HandlerEnum, InteractionState } from '..';

export interface IEventManager {
	start(canvasEl: HTMLElement): void;
	/** 清空跨 handler 共享的选中/悬停状态（如删除选中图形后调用） */
	clearSelection(): void;
}
export const IEventManager = Symbol('IEventManager');

export interface IEventMode {
	mode: EventModeEnum;
	handlerList: IHandler[];

	enable(): boolean;

	onActivate(): void;
	onDeactivate(): void;
}
export const IEventMode = Symbol('IEventMode');

export interface IHandler {
	type: HandlerEnum;

	/** 越小越优先执行 */
	sort: number;

	enable(state: InteractionState): boolean;

	execute(e: PointerEvent, state: InteractionState, payload: EventPayload): boolean;
}
export const IHandler = Symbol('IHandler');
export const IHandlerWithCreator = Symbol('IHandlerWithCreator');
export const IHandlerWithInteraction = Symbol('IHandlerWithInteraction');
