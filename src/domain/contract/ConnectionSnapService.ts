import type { LineEndpointValue } from '@/shape/contract';

export interface ConnectionSnapRequest {
	/** 当前拖拽端点的世界坐标。 */
	point: Point;
	/** 当前视口缩放，用于把屏幕像素吸附距离换算为世界坐标。 */
	viewportScale: number;
	/** 本次吸附需要排除的图形。 */
	excludeIds?: ReadonlySet<string>;
}

export interface IConnectionSnapService {
	/** 返回绑定到最近图形锚点的端点；没有吸附目标时返回 null。 */
	resolveEndpoint(request: ConnectionSnapRequest): LineEndpointValue | null;
}

export const IConnectionSnapService = Symbol('IConnectionSnapService');
