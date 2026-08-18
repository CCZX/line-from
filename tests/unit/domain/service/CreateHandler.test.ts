import { describe, expect, it, vi } from 'vitest';
import type { IocContainerService } from '@/common/contract';
import { ToolType } from '@/domain/contract';
import type { EventPayload, InteractionState } from '@/domain/contract/EventManager';
import { CreateShapeAction } from '@/domain/service/Action/Actions/CreateShapeAction';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { CreateHandler } from '@/domain/service/Events/modes/creator/handlers/CreateHandler';
import { ShapeTypeEnum } from '@/shape/contract';

function createHandler(activeTool: ToolType) {
	const push = vi.fn();
	const setStreamStart = vi.fn();
	const setStreamEnd = vi.fn();
	const setActiveTool = vi.fn();
	const handler = new CreateHandler();

	Object.assign(handler, {
		ioc: {} as IocContainerService,
		actionManager: { push },
		actionLogManager: { setStreamStart, setStreamEnd },
		shapeManager: {
			getShapeByPoint: vi.fn(() => undefined),
			getShapeById: vi.fn(() => undefined),
		},
		viewportService: {
			clientToViewportLocal: vi.fn((x: number, y: number) => ({ x, y })),
		},
		toolService: {
			store: {
				getState: () => ({ activeTool, setActiveTool }),
			},
		},
	});

	return { handler, push, setStreamStart, setStreamEnd };
}

const state: InteractionState = { hoveredShape: null };
const payload: EventPayload = {
	viewportPoint: { x: 20, y: 30 },
	screenPoint: { x: 20, y: 30 },
	scale: 1,
};

describe('CreateHandler', () => {
	it.each([
		[ToolType.RoundedRect, ShapeTypeEnum.RoundedRectangle],
		[ToolType.Diamond, ShapeTypeEnum.Diamond],
	])('%s 工具进入拖拽创建流程并创建对应图形', (tool, shapeType) => {
		const { handler, push, setStreamStart } = createHandler(tool);

		expect(handler.enable(state)).toBe(true);
		expect(handler.execute({ type: 'pointerdown' } as PointerEvent, state, payload)).toBe(false);

		expect(setStreamStart).toHaveBeenCalledOnce();
		const action = push.mock.calls[0][0] as CreateShapeAction;
		expect(action.data[0]).toMatchObject({
			type: shapeType,
			properties: {
				base: { x: 20, y: 30, width: 0, height: 0 },
				text: { text: '' },
			},
		});
	});

	it('箭头工具进入创建流程，并创建带终点箭头的连线', () => {
		const { handler, push, setStreamStart } = createHandler(ToolType.Arrow);

		expect(handler.enable(state)).toBe(true);
		expect(handler.execute({ type: 'pointerdown' } as PointerEvent, state, payload)).toBe(false);

		expect(setStreamStart).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledOnce();
		const action = push.mock.calls[0][0] as CreateShapeAction;
		expect(action).toBeInstanceOf(CreateShapeAction);
		expect(action.data[0]).toMatchObject({
			type: ShapeTypeEnum.Line,
			properties: {
				base: { x: 20, y: 30, width: 0, height: 0 },
				line: {
					start: { x: 20, y: 30 },
					end: { x: 20, y: 30 },
					routing: 'straight',
					endArrow: true,
				},
			},
		});
	});

	it('普通直线不会显示终点箭头', () => {
		const { handler, push } = createHandler(ToolType.Line);

		handler.execute({ type: 'pointerdown' } as PointerEvent, state, payload);

		const action = push.mock.calls[0][0] as CreateShapeAction;
		expect(action.data[0].properties.line?.endArrow).toBe(false);
	});

	it.each([
		[ToolType.RoundedRect, { x: -40, y: -10, width: 120, height: 80 }],
		[ToolType.Rect, { x: -40, y: -30, width: 120, height: 120 }],
		[ToolType.Diamond, { x: -40, y: -30, width: 120, height: 120 }],
		[ToolType.Circle, { x: -20, y: -10, width: 80, height: 80 }],
	])('%s 工具单击创建时使用对应的默认尺寸', (tool, expectedBase) => {
		const { handler, push, setStreamEnd } = createHandler(tool);

		handler.execute({ type: 'pointerdown' } as PointerEvent, state, payload);
		handler.execute({ type: 'pointerup' } as PointerEvent, state, payload);

		const action = push.mock.calls[1][0] as UpdatePropsAction;
		expect(action).toBeInstanceOf(UpdatePropsAction);
		expect(action.data[0].properties.base).toEqual(expectedBase);
		expect(setStreamEnd).toHaveBeenCalledOnce();
	});
});
