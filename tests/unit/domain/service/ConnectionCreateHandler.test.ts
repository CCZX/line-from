import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IocContainerService } from '@/common/contract';
import { CreateShapeAction } from '@/domain/service/Action/Actions/CreateShapeAction';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { ConnectionCreateHandler } from '@/domain/service/Events/modes/interaction/handlers/ConnectionCreateHandler';
import type { LineEndpointValue } from '@/shape/contract';

interface ConnectionCreateHandlerInternals {
	createLine(start: LineEndpointValue, end: LineEndpointValue): void;
	updateLine(end: LineEndpointValue): void;
	trySnapEndpoint(point: Point, sourceId: string, viewportScale: number): LineEndpointValue;
	finish(): void;
}

describe('ConnectionCreateHandler', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('创建后通过流式 UpdatePropsAction 持续更新连线', () => {
		vi.stubGlobal('document', { body: { style: { cursor: '' } } });
		const push = vi.fn();
		const setStreamStart = vi.fn();
		const setStreamEnd = vi.fn();
		const handler = new ConnectionCreateHandler();
		Object.assign(handler, {
			ioc: {} as IocContainerService,
			actionManager: { push },
			actionLogManager: { setStreamStart, setStreamEnd },
		});
		const internals = handler as unknown as ConnectionCreateHandlerInternals;
		const start = { x: 10, y: 20 };
		const initialEnd = { x: 30, y: 40 };
		const finalEnd = { x: 80, y: 100 };

		internals.createLine(start, initialEnd);
		internals.updateLine(finalEnd);
		internals.finish();

		expect(setStreamStart).toHaveBeenCalledOnce();
		expect(setStreamStart.mock.invocationCallOrder[0]).toBeLessThan(
			push.mock.invocationCallOrder[0],
		);
		expect(setStreamEnd).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledTimes(2);
		expect(push.mock.calls[0][0]).toBeInstanceOf(CreateShapeAction);

		const updateAction = push.mock.calls[1][0] as UpdatePropsAction;
		expect(updateAction).toBeInstanceOf(UpdatePropsAction);
		expect(updateAction.data[0]).toMatchObject({
			properties: {
				base: { x: 10, y: 20, width: 70, height: 80 },
				line: { start, end: finalEnd },
			},
		});
	});

	it('将当前端点和排除图形交给吸附服务解析', () => {
		const snapped = { x: 160, y: 180, shapeId: 'target', anchor: 'bottom' as const };
		const resolveEndpoint = vi.fn(() => snapped);
		const handler = new ConnectionCreateHandler();
		Object.assign(handler, {
			connectionSnapService: { resolveEndpoint },
		});

		const endpoint = (
			handler as unknown as ConnectionCreateHandlerInternals
		).trySnapEndpoint({ x: 160, y: 190 }, 'source', 1);

		expect(endpoint).toEqual(snapped);
		expect(resolveEndpoint).toHaveBeenCalledWith({
			point: { x: 160, y: 190 },
			viewportScale: 1,
			excludeIds: new Set(['source']),
		});
	});
});
