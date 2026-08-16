import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import {
	IAlignmentSnapService,
	type SnapGuide,
	type SnapMoveRequest,
	type SnapMoveResult,
} from '@/domain/contract/AlignmentSnapService';
import { IShapeManager } from '@/domain/contract/ShapeManager';
import { IViewportService } from '@/domain/contract/ViewportService';
import { getShapeWorldBounds } from '@/domain/service/ShapeManager/ShapeBounds';
import type { BaseShape } from '@/shape/BaseShape';
import { SnapGuideRenderer } from './SnapGuideRenderer';
import type { SnapAnchorKind, SnapMatch, SourceAnchor, TargetAnchor } from './types';

const ENTER_THRESHOLD_PX = 6;
const RELEASE_THRESHOLD_PX = 10;
const GUIDE_PADDING_PX = 8;
const VIEWPORT_MARGIN_PX = 32;
const EPSILON = 0.0001;

const KIND_ORDER: Record<SnapAnchorKind, number> = {
	start: 0,
	center: 1,
	end: 2,
};

@provide(IAlignmentSnapService)
export class AlignmentSnapService implements IAlignmentSnapService {
	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	private renderer: SnapGuideRenderer | null = null;
	private xTargets: TargetAnchor[] = [];
	private yTargets: TargetAnchor[] = [];
	private activeX: SnapMatch | null = null;
	private activeY: SnapMatch | null = null;
	private enabled = false;

	public begin(movingShapes: BaseShape[]): void {
		this.end();

		this.enabled = movingShapes.some((shape) => shape.supportsAlignmentSnap);
		if (!this.enabled) {
			return;
		}

		const movingIds = new Set(movingShapes.map((shape) => shape.id));
		const scale = Math.max(this.viewportService.store.getState().scale, Number.EPSILON);
		const visibleBounds = this.viewportService.getVisibleWorldRect();
		const margin = VIEWPORT_MARGIN_PX / scale;
		const searchBounds = {
			x: visibleBounds.x - margin,
			y: visibleBounds.y - margin,
			width: visibleBounds.width + margin * 2,
			height: visibleBounds.height + margin * 2,
		};

		const candidates = this.shapeManager.getShapesByRect(searchBounds);
		candidates.forEach((shape, order) => {
			if (movingIds.has(shape.id) || !shape.supportsAlignmentSnap) {
				return;
			}

			const bounds = getShapeWorldBounds(shape);
			this.xTargets.push(...this.createTargetAnchors('x', shape.id, bounds, order));
			this.yTargets.push(...this.createTargetAnchors('y', shape.id, bounds, order));
		});

		this.xTargets.sort((a, b) => this.compareTargetAnchors(a, b));
		this.yTargets.sort((a, b) => this.compareTargetAnchors(a, b));
	}

	public resolveMove(request: SnapMoveRequest): SnapMoveResult {
		if (!this.enabled || request.disabled) {
			this.activeX = null;
			this.activeY = null;
			this.renderer?.clear();
			return { delta: { ...request.rawDelta }, guides: [] };
		}

		const scale = Math.max(request.scale, Number.EPSILON);
		const rawBounds = this.translateBounds(request.originBounds, request.rawDelta);
		const enterThreshold = ENTER_THRESHOLD_PX / scale;
		const releaseThreshold = RELEASE_THRESHOLD_PX / scale;

		this.activeX = this.resolveAxis(
			'x',
			rawBounds,
			this.xTargets,
			this.activeX,
			enterThreshold,
			releaseThreshold,
		);
		this.activeY = this.resolveAxis(
			'y',
			rawBounds,
			this.yTargets,
			this.activeY,
			enterThreshold,
			releaseThreshold,
		);

		const delta = {
			x: request.rawDelta.x + (this.activeX?.correction ?? 0),
			y: request.rawDelta.y + (this.activeY?.correction ?? 0),
		};
		const finalBounds = this.translateBounds(request.originBounds, delta);
		const guides = this.createGuides(finalBounds, scale);

		if (guides.length > 0) {
			this.getRenderer().render(guides, scale);
		} else {
			this.renderer?.clear();
		}

		return { delta, guides };
	}

	public end(): void {
		this.xTargets = [];
		this.yTargets = [];
		this.activeX = null;
		this.activeY = null;
		this.enabled = false;
		this.renderer?.clear();
	}

	private resolveAxis(
		axis: 'x' | 'y',
		bounds: Rectangle,
		targets: TargetAnchor[],
		active: SnapMatch | null,
		enterThreshold: number,
		releaseThreshold: number,
	): SnapMatch | null {
		const sources = this.createSourceAnchors(axis, bounds);

		if (active) {
			const source = sources.find((item) => item.kind === active.source.kind);
			if (source) {
				const correction = active.target.position - source.position;
				if (Math.abs(correction) <= releaseThreshold) {
					return this.createMatch(source, active.target, bounds, correction);
				}
			}
		}

		let best: SnapMatch | null = null;
		for (const source of sources) {
			const startIndex = this.lowerBound(targets, source.position - enterThreshold);
			for (let i = startIndex; i < targets.length; i++) {
				const target = targets[i];
				if (target.position > source.position + enterThreshold) {
					break;
				}

				const match = this.createMatch(source, target, bounds, target.position - source.position);
				if (!best || this.isBetterMatch(match, best)) {
					best = match;
				}
			}
		}

		return best;
	}

	private createSourceAnchors(axis: 'x' | 'y', bounds: Rectangle): SourceAnchor[] {
		const start = axis === 'x' ? bounds.x : bounds.y;
		const size = axis === 'x' ? bounds.width : bounds.height;
		return [
			{ kind: 'start', position: start },
			{ kind: 'center', position: start + size / 2 },
			{ kind: 'end', position: start + size },
		];
	}

	private createTargetAnchors(
		axis: 'x' | 'y',
		shapeId: string,
		bounds: Rectangle,
		order: number,
	): TargetAnchor[] {
		return this.createSourceAnchors(axis, bounds).map((anchor) => ({
			...anchor,
			axis,
			shapeId,
			bounds,
			order,
		}));
	}

	private createMatch(
		source: SourceAnchor,
		target: TargetAnchor,
		bounds: Rectangle,
		correction: number,
	): SnapMatch {
		const orthogonalGap =
			target.axis === 'x'
				? this.intervalGap(
						bounds.y,
						bounds.y + bounds.height,
						target.bounds.y,
						target.bounds.y + target.bounds.height,
				  )
				: this.intervalGap(
						bounds.x,
						bounds.x + bounds.width,
						target.bounds.x,
						target.bounds.x + target.bounds.width,
				  );

		return {
			source,
			target,
			correction,
			orthogonalGap,
			kindPriority: this.getKindPriority(source.kind, target.kind),
		};
	}

	private createGuides(bounds: Rectangle, scale: number): SnapGuide[] {
		const padding = GUIDE_PADDING_PX / scale;
		const guides: SnapGuide[] = [];

		if (this.activeX) {
			const target = this.activeX.target.bounds;
			guides.push({
				axis: 'x',
				position: this.activeX.target.position,
				start: Math.min(bounds.y, target.y) - padding,
				end: Math.max(bounds.y + bounds.height, target.y + target.height) + padding,
			});
		}

		if (this.activeY) {
			const target = this.activeY.target.bounds;
			guides.push({
				axis: 'y',
				position: this.activeY.target.position,
				start: Math.min(bounds.x, target.x) - padding,
				end: Math.max(bounds.x + bounds.width, target.x + target.width) + padding,
			});
		}

		return guides;
	}

	private isBetterMatch(next: SnapMatch, current: SnapMatch): boolean {
		const nextDistance = Math.abs(next.correction);
		const currentDistance = Math.abs(current.correction);
		if (Math.abs(nextDistance - currentDistance) > EPSILON) {
			return nextDistance < currentDistance;
		}
		if (next.kindPriority !== current.kindPriority) {
			return next.kindPriority < current.kindPriority;
		}
		if (Math.abs(next.orthogonalGap - current.orthogonalGap) > EPSILON) {
			return next.orthogonalGap < current.orthogonalGap;
		}
		if (next.target.order !== current.target.order) {
			return next.target.order < current.target.order;
		}
		if (KIND_ORDER[next.source.kind] !== KIND_ORDER[current.source.kind]) {
			return KIND_ORDER[next.source.kind] < KIND_ORDER[current.source.kind];
		}
		return KIND_ORDER[next.target.kind] < KIND_ORDER[current.target.kind];
	}

	private getKindPriority(source: SnapAnchorKind, target: SnapAnchorKind): number {
		if (source === 'center' && target === 'center') {
			return 0;
		}
		if (source === target) {
			return 1;
		}
		return 2;
	}

	private compareTargetAnchors(a: TargetAnchor, b: TargetAnchor): number {
		return a.position - b.position || a.order - b.order || KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
	}

	private lowerBound(targets: TargetAnchor[], value: number): number {
		let low = 0;
		let high = targets.length;
		while (low < high) {
			const middle = Math.floor((low + high) / 2);
			if (targets[middle].position < value) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		return low;
	}

	private intervalGap(startA: number, endA: number, startB: number, endB: number): number {
		if (endA < startB) {
			return startB - endA;
		}
		if (endB < startA) {
			return startA - endB;
		}
		return 0;
	}

	private translateBounds(bounds: Rectangle, delta: Point): Rectangle {
		return {
			x: bounds.x + delta.x,
			y: bounds.y + delta.y,
			width: bounds.width,
			height: bounds.height,
		};
	}

	private getRenderer(): SnapGuideRenderer {
		if (!this.renderer) {
			this.renderer = new SnapGuideRenderer(this.viewportService);
		}
		return this.renderer;
	}
}
