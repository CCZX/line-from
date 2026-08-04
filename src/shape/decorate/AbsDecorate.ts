import { ShapeDecorateTypeEnum } from '../contract';
import type { IViewportService } from '@/domain/contract/ViewportService';
import type { BaseShape } from '../BaseShape';

export interface DecorateViewport {
	getScale(): number;
	subscribe(listener: (scale: number) => void): () => void;
}

export function createDecorateViewport(viewportService: IViewportService): DecorateViewport {
	const store = viewportService.store;

	return {
		getScale(): number {
			const scale = store.getState().scale;
			return scale > 0 ? scale : 1;
		},
		subscribe(listener: (scale: number) => void): () => void {
			return store.subscribe((state, previousState) => {
				if (state.scale !== previousState.scale) {
					listener(state.scale);
				}
			});
		},
	};
}

export abstract class AbsDecorate {
	public abstract type: ShapeDecorateTypeEnum;

	protected shape: BaseShape;
	private viewport: DecorateViewport;
	private unsubscribeViewportScale: (() => void) | null = null;

	constructor(shape: BaseShape, viewport: DecorateViewport) {
		this.shape = shape;
		this.viewport = viewport;
	}

	public abstract onActivate(): void;

	public abstract onDeactivate(): void;

	public refresh(): void {}

	protected getViewportScale(): number {
		return this.viewport.getScale();
	}

	protected startViewportScaleSync(): void {
		this.stopViewportScaleSync();
		this.unsubscribeViewportScale = this.viewport.subscribe(() => this.refresh());
	}

	protected stopViewportScaleSync(): void {
		this.unsubscribeViewportScale?.();
		this.unsubscribeViewportScale = null;
	}
}
