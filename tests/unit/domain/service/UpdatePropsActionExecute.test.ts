import { describe, expect, it, vi } from 'vitest';
import type { IocContainerService } from '@/common/contract';
import type { ISelectService, IShapeManager } from '@/domain/contract';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { UpdatePropsActionExecute } from '@/domain/service/Action/ActionExecutes/UpdatePropsActionExecute';
import type { BaseShape } from '@/shape/BaseShape';
import { ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';

describe('UpdatePropsActionExecute', () => {
	it('图形全部属性更新完成后刷新一次空间索引', () => {
		const updateProperty = vi.fn();
		const shape = { id: 'shape-1', updateProperty } as unknown as BaseShape;
		const refreshShapeIndex = vi.fn();
		const shapeManager = {
			getShapeById: vi.fn(() => shape),
			refreshShapeIndex,
		} as unknown as IShapeManager;
		const updateMultiSelectOverlay = vi.fn();
		const execute = new UpdatePropsActionExecute();
		Object.assign(execute, {
			shapeManager,
			selectService: { updateMultiSelectOverlay } as unknown as ISelectService,
		});
		const action = new UpdatePropsAction(
			[
				{
					id: 'shape-1',
					type: ShapeTypeEnum.Rectangle,
					properties: {
						base: { x: 10, y: 20, width: 100, height: 80 },
						stroke: { color: 0, width: 2, alpha: 1 },
					},
				},
			],
			{} as IocContainerService,
		);

		execute.execute(action);

		expect(updateProperty).toHaveBeenNthCalledWith(1, ShapePropertyEnum.Base, {
			x: 10,
			y: 20,
			width: 100,
			height: 80,
		});
		expect(updateProperty).toHaveBeenNthCalledWith(2, ShapePropertyEnum.Stroke, {
			color: 0,
			width: 2,
			alpha: 1,
		});
		expect(refreshShapeIndex).toHaveBeenCalledOnce();
		expect(refreshShapeIndex).toHaveBeenCalledWith('shape-1');
		expect(updateProperty.mock.invocationCallOrder[1]).toBeLessThan(
			refreshShapeIndex.mock.invocationCallOrder[0],
		);
		expect(updateMultiSelectOverlay).toHaveBeenCalledWith([shape]);
	});
});
