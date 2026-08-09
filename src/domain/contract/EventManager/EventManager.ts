import { EventModeEnum, EventPayload, HandlerEnum, InteractionState } from '..';

export interface IEventManager {
	start(canvasEl: HTMLElement): void;
	/** 清空跨 handler 共享的临时交互状态（如删除悬停图形后调用）。 */
	clearInteractionState(): void;
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
