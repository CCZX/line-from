import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IocContainerService } from '@/common/contract';
import type { EventPayload, InteractionState } from '@/domain/contract/EventManager';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { MoveHandler } from '@/domain/service/Events/modes/interaction/handlers/MoveHandler';
import { BaseShape } from '@/shape/BaseShape';
import {
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
	type BasePropertyValue,
	type LinePropertyValue,
} from '@/shape/contract';
import { MatrixService } from '@/common/service/MatrixService';

const state: InteractionState = { hoveredShape: null };
const matrixService = new MatrixService();

function payload(x: number, y: number): EventPayload {
	return {
		viewportPoint: { x, y },
		screenPoint: { x, y },
		scale: 1,
	};
}

function createShape(
	id: string,
	type: ShapeTypeEnum,
	base: BasePropertyValue,
	line?: LinePropertyValue,
) {
	return {
		id,
		type,
		container: {
			x: base.x + base.width / 2,
			y: base.y + base.height / 2,
			angle: base.rotation ?? 0,
		},
		getBounds: () => ({ x: 0, y: 0, width: base.width, height: base.height }),
		getWorldBounds: BaseShape.prototype.getWorldBounds,
		supportsAlignmentSnap: type !== ShapeTypeEnum.Line,
		hasProperty: (property: ShapePropertyEnum) =>
			property === ShapePropertyEnum.Line && line !== undefined,
		getProperty: vi.fn((property: ShapePropertyEnum) => {
			if (property === ShapePropertyEnum.Base) {
				return { get: () => ({ ...base }) };
			}
			if (property === ShapePropertyEnum.Line && line) {
				return { get: () => ({ ...line }) };
			}
			return undefined;
		}),
		setState: vi.fn(),
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('MoveHandler alignment snap', () => {
	it('将吸附后的统一位移应用到多选图形和直线坐标', () => {
		vi.stubGlobal('document', { body: { style: { cursor: '' } } });
		const rectangle = createShape('rectangle', ShapeTypeEnum.Rectangle, {
			x: 0,
			y: 0,
			width: 100,
			height: 100,
		});
		const line = createShape(
			'line',
			ShapeTypeEnum.Line,
			{ x: 200, y: 200, width: 100, height: 100 },
			{
				start: { x: 200, y: 200 },
				end: { x: 300, y: 300 },
				midPoints: [{ x: 250, y: 220 }],
			},
		);
		const selectedShapes = [rectangle, line];
		const push = vi.fn();
		const alignmentSnapService = {
			begin: vi.fn(),
			resolveMove: vi.fn(() => ({ delta: { x: 15, y: 20 }, guides: [] })),
			end: vi.fn(),
		};
		const handler = new MoveHandler();
		Object.assign(handler, {
			shapeManager: { getShapeByPoint: () => rectangle },
			selectService: {
				getSelectedShapes: () => selectedShapes,
				getMultiSelectOverlayRect: () => null,
				updateMultiSelectOverlay: vi.fn(),
			},
			viewportService: {
				clientToViewportLocal: (x: number, y: number) => ({ x, y }),
			},
			actionManager: { push },
			actionLogManager: { setStreamStart: vi.fn(), setStreamEnd: vi.fn() },
			alignmentSnapService,
			matrixService,
			ioc: {} as IocContainerService,
		});

		handler.execute({ type: 'pointerdown', buttons: 1 } as PointerEvent, state, payload(10, 10));
		handler.execute(
			{ type: 'pointermove', buttons: 1, altKey: false } as PointerEvent,
			state,
			payload(20, 20),
		);
		handler.execute(
			{ type: 'pointermove', buttons: 1, altKey: false } as PointerEvent,
			state,
			payload(22, 22),
		);

		expect(alignmentSnapService.begin).toHaveBeenCalledWith(selectedShapes);
		expect(alignmentSnapService.resolveMove).toHaveBeenCalledWith({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 12, y: 12 },
			scale: 1,
			disabled: false,
		});
		expect(push).toHaveBeenCalledOnce();

		const action = push.mock.calls[0][0] as UpdatePropsAction;
		expect(action.data[0].properties.base).toMatchObject({ x: 15, y: 20 });
		expect(action.data[1].properties).toMatchObject({
			base: { x: 215, y: 220 },
			line: {
				start: { x: 215, y: 220 },
				end: { x: 315, y: 320 },
				midPoints: [{ x: 265, y: 240 }],
			},
		});

		handler.execute({ type: 'pointerup', buttons: 0 } as PointerEvent, state, payload(22, 22));
		expect(alignmentSnapService.end).toHaveBeenCalled();
		expect(rectangle.setState).toHaveBeenLastCalledWith(ShapeStateEnum.MultiSelected);
		expect(line.setState).toHaveBeenLastCalledWith(ShapeStateEnum.MultiSelected);
	});
});
