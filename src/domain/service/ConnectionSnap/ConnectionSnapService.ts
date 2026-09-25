import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';
import {
	IConnectionSnapService,
	type ConnectionSnapRequest,
} from '@lineform/domain/contract/ConnectionSnapService';
import { IShapeManager } from '@lineform/domain/contract/ShapeManager';
import type { LineEndpointValue } from '@lineform/shape/contract';
import { getNearestShapeAnchor } from '@lineform/shape/geometry';

/** 屏幕像素级吸附半径，缩放后会换算为世界坐标。 */
export const CONNECTION_SNAP_RADIUS = 12;

@provide(IConnectionSnapService)
export class ConnectionSnapService implements IConnectionSnapService {
	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	public resolveEndpoint(request: ConnectionSnapRequest): LineEndpointValue | null {
		const { point, excludeIds } = request;
		const safeScale =
			Number.isFinite(request.viewportScale) && request.viewportScale > 0
				? request.viewportScale
				: 1;
		const target = this.shapeManager.getShapeByPoint(point, {
			hitSlop: CONNECTION_SNAP_RADIUS / safeScale,
			filter: (shape) => shape.acceptsConnections && !excludeIds?.has(shape.id),
		});
		if (!target) {
			return null;
		}

		const nearest = getNearestShapeAnchor(target, point);
		return {
			x: nearest.point.x,
			y: nearest.point.y,
			shapeId: target.id,
			anchor: nearest.anchor,
		};
	}
}
