import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IShapeManager, ShapeHitTestOptions } from '@/domain/contract';
import {
	CONNECTION_SNAP_RADIUS,
	ConnectionSnapService,
} from '@/domain/service/ConnectionSnap';
import type { BaseShape } from '@/shape/BaseShape';

describe('ConnectionSnapService', () => {
	let service: ConnectionSnapService;
	let options: ShapeHitTestOptions | undefined;
	let target: BaseShape | undefined;
	let getShapeByPoint: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		target = undefined;
		options = undefined;
		getShapeByPoint = vi.fn((_point: Point, value?: ShapeHitTestOptions) => {
			options = value;
			return target;
		});
		service = new ConnectionSnapService();
		Object.assign(service, {
			shapeManager: { getShapeByPoint } as unknown as IShapeManager,
		});
	});

	it('统一解析目标图形、最近锚点和绑定端点', () => {
		target = {
			id: 'target',
			acceptsConnections: true,
			getProperty: vi.fn(() => ({
				get: () => ({ x: 100, y: 100, width: 120, height: 80 }),
			})),
		} as unknown as BaseShape;

		const endpoint = service.resolveEndpoint({
			point: { x: 230, y: 140 },
			viewportScale: 2,
		});

		expect(endpoint).toEqual({
			x: 220,
			y: 140,
			shapeId: 'target',
			anchor: 'right',
		});
		expect(getShapeByPoint).toHaveBeenCalledWith(
			{ x: 230, y: 140 },
			expect.objectContaining({ hitSlop: CONNECTION_SNAP_RADIUS / 2 }),
		);
	});

	it('过滤不可连接图形和调用方指定的排除图形', () => {
		service.resolveEndpoint({
			point: { x: 0, y: 0 },
			viewportScale: 1,
			excludeIds: new Set(['excluded']),
		});

		const filter = options!.filter!;
		expect(filter({ id: 'target', acceptsConnections: true } as BaseShape)).toBe(true);
		expect(filter({ id: 'excluded', acceptsConnections: true } as BaseShape)).toBe(false);
		expect(filter({ id: 'line', acceptsConnections: false } as BaseShape)).toBe(false);
	});

	it('没有吸附目标时返回 null', () => {
		expect(
			service.resolveEndpoint({ point: { x: 10, y: 20 }, viewportScale: 1 }),
		).toBeNull();
	});
});
