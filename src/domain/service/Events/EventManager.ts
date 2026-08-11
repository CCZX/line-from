import { InteractionState, EventPayload } from '../../contract/EventManager';
import { IEventManager, IEventMode, IViewportService } from '../../contract';
import { inject, multiInject } from 'inversify';
import { provideMultiple } from '@/common/context';
import { IDestroyable } from '@/common/contract/Destroyable';

@provideMultiple(IEventManager, IDestroyable)
export class EventManager implements IEventManager, IDestroyable {
	/** 跨 handler 共享的可变状态 */
	private state: InteractionState = {
		hoveredShape: null,
	};

	@multiInject(IEventMode)
	private eventModeList: IEventMode[] = [];

	private activeMode: IEventMode | null = null;

	private canvasEl: HTMLElement | null = null;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	private getEventPayload(e: PointerEvent): EventPayload {
		return {
			viewportPoint: { x: e.clientX, y: e.clientY },
			screenPoint: { x: e.pageX, y: e.pageY },
			scale: this.viewportService.store.getState().scale,
		};
	}

	private dispatch(e: PointerEvent) {
		const mode = this.eventModeList.find((m) => m.enable()) || null;

		if (mode !== this.activeMode) {
			this.activeMode?.onDeactivate();
			this.activeMode = mode;
			mode?.onActivate();
		}

		if (!this.activeMode) {
			return;
		}

		const payload = this.getEventPayload(e);

		for (const handler of this.activeMode.handlerList) {
			if (!handler.enable(this.state)) {
				continue;
			}
			const shouldContinue = handler.execute(e, this.state, payload);
			if (!shouldContinue) {
				break;
			}
		}
	}

	private onPointermove = (e: PointerEvent) => {
		this.dispatch(e);
	};

	private onPointerdown = (e: PointerEvent) => {
		// 仅响应画布区域内的 pointerdown，避免点击属性面板等外部 UI 时触发选中逻辑
		if (this.canvasEl && !this.canvasEl.contains(e.target as Node)) {
			return;
		}
		this.dispatch(e);
	};

	private onPointerup = (e: PointerEvent) => {
		this.dispatch(e);
	};

	private onPointercancel = (e: PointerEvent) => {
		this.dispatch(e);
	};

	public start(canvasEl: HTMLElement) {
		this.canvasEl = canvasEl;

		document.addEventListener('pointermove', this.onPointermove);
		document.addEventListener('pointerdown', this.onPointerdown);
		document.addEventListener('pointerup', this.onPointerup);
		document.addEventListener('pointercancel', this.onPointercancel);
	}

	public destroy() {
		this.canvasEl = null;
		this.activeMode = null;
		document.removeEventListener('pointermove', this.onPointermove);
		document.removeEventListener('pointerdown', this.onPointerdown);
		document.removeEventListener('pointerup', this.onPointerup);
		document.removeEventListener('pointercancel', this.onPointercancel);
	}

	public clearInteractionState(): void {
		this.state.hoveredShape = null;
	}
}
