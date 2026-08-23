import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IocContainerService } from '@/common/contract';
import {
	IActionManager,
	IShapeManager,
	type IAction,
} from '@/domain/contract';
import type { EventPayload, InteractionState } from '@/domain/contract/EventManager';
import { ActionLogManager } from '@/domain/service/Action/ActionLogManager';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { RotateHandler } from '@/domain/service/Events/modes/interaction/handlers/RotateHandler';
import type { BasePropertyValue } from '@/shape/contract';
import {
	ShapeDecorateTypeEnum,
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
} from '@/shape/contract';
import { MatrixService } from '@/common/service/MatrixService';

const state: InteractionState = { hoveredShape: null };

function payload(x: number, y: number): EventPayload {
	return {
		viewportPoint: { x, y },
		screenPoint: { x, y },
		scale: 1,
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('RotateHandler', () => {
	it('旋转通过动作栈执行，支持 undo 和 redo', () => {
		vi.stubGlobal('document', { body: { style: { cursor: '' } } });

		// 兼容历史/默认数据：未旋转图形通常没有显式的 rotation 字段。
		let baseValue: BasePropertyValue = { x: 0, y: 0, width: 100, height: 100 };
		const baseProperty = {
			get value() {
				return baseValue;
			},
			get: () => ({ ...baseValue }),
		};
		const shape = {
			id: 'shape-1',
			type: ShapeTypeEnum.Rectangle,
			container: {
				pivot: { x: 50, y: 50 },
				toGlobal: (point: { x: number; y: number }) => ({ ...point }),
			},
			getProperty: vi.fn((type: ShapePropertyEnum) =>
				type === ShapePropertyEnum.Base ? baseProperty : undefined,
			),
			getDecorate: vi.fn((type: ShapeDecorateTypeEnum) =>
				type === ShapeDecorateTypeEnum.SelectedBorder
					? { getRotateHandleCenter: () => ({ x: 50, y: -16 }) }
					: undefined,
			),
			setState: vi.fn(),
		};

		const actionLogManager = new ActionLogManager();
		let actionManager: IActionManager;
		const shapeManager = { getShapeById: vi.fn(() => shape) };
		const ioc = {
			get: (token: symbol) => {
				if (token === IActionManager) {
					return actionManager;
				}
				if (token === IShapeManager) {
					return shapeManager;
				}
				return undefined;
			},
		} as unknown as IocContainerService;

		actionManager = {
			push: vi.fn((action: IAction<unknown>) => {
				if (action.getNeedAddLog()) {
					actionLogManager.addAction(action);
				}
				const update = action as UpdatePropsAction;
				// 与 BaseProperty.update 的合并语义保持一致。
				baseValue = { ...baseValue, ...update.data[0].properties.base };
			}),
		};
		Object.assign(actionLogManager, { ioc });

		const handler = new RotateHandler();
		Object.assign(handler, {
			selectService: { getSelectedShapes: () => [shape] },
			actionManager,
			actionLogManager,
			matrixService: new MatrixService(),
			ioc,
		});

		handler.execute({ type: 'pointerdown', buttons: 1 } as PointerEvent, state, payload(50, -16));
		handler.execute({ type: 'pointermove', buttons: 1 } as PointerEvent, state, payload(116, 50));
		handler.execute({ type: 'pointerup', buttons: 0 } as PointerEvent, state, payload(116, 50));

		expect(baseValue.rotation).toBe(90);
		expect(shape.setState).toHaveBeenCalledWith(ShapeStateEnum.Rotating);
		expect(shape.setState).toHaveBeenLastCalledWith(ShapeStateEnum.Selected);

		actionLogManager.undo();
		expect(baseValue.rotation).toBe(0);

		actionLogManager.redo();
		expect(baseValue.rotation).toBe(90);
	});
});
