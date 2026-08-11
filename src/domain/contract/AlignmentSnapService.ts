import type { BaseShape } from '@/shape/BaseShape';

export type SnapAxis = 'x' | 'y';

export interface SnapGuide {
	axis: SnapAxis;
	position: number;
	start: number;
	end: number;
}

export interface SnapMoveRequest {
	originBounds: Rectangle;
	rawDelta: Point;
	scale: number;
	disabled?: boolean;
}

export interface SnapMoveResult {
	delta: Point;
	guides: SnapGuide[];
}

export interface IAlignmentSnapService {
	/** 建立一次拖拽会话，并缓存当前可见的吸附候选。 */
	begin(movingShapes: BaseShape[]): void;

	/** 根据鼠标原始位移返回加入吸附修正后的最终位移。 */
	resolveMove(request: SnapMoveRequest): SnapMoveResult;

	/** 结束拖拽会话并清理辅助线和迟滞状态。 */
	end(): void;
}

export const IAlignmentSnapService = Symbol('IAlignmentSnapService');
