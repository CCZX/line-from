import type { SnapAxis } from '@/domain/contract/AlignmentSnapService';

export type SnapAnchorKind = 'start' | 'center' | 'end';

export interface SourceAnchor {
	kind: SnapAnchorKind;
	position: number;
}

export interface TargetAnchor extends SourceAnchor {
	axis: SnapAxis;
	shapeId: string;
	bounds: Rectangle;
	order: number;
}

export interface SnapMatch {
	source: SourceAnchor;
	target: TargetAnchor;
	correction: number;
	orthogonalGap: number;
	kindPriority: number;
}
