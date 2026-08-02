import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { BaseShape } from '@/shape/BaseShape';
import type { IViewportService } from '@/domain/contract';
import { ShapeManager } from '@/domain/service/ShapeManager';

interface ShapeMock {
	id: string;
	container: {
		toLocal: Mock;
		destroy: Mock;
	};
	containsPoint: Mock;
}

function createShape(id: string, containsPoint = false): ShapeMock {
	return {
		id,
		container: {
			toLocal: vi.fn(() => ({ x: 0, y: 0 })),
			destroy: vi.fn(),
		},
		containsPoint: vi.fn(() => containsPoint),
	};
}

describe('ShapeManager', () => {
	let manager: ShapeManager;
	let viewport: object;
	let stage: {
		appendShape: Mock;
		removeShape: Mock;
		getViewport: Mock;
	};
	let viewportService: {
		getStage: Mock;
	};

	beforeEach(() => {
		viewport = {};
		stage = {
			appendShape: vi.fn(),
			removeShape: vi.fn(),
			getViewport: vi.fn(() => viewport),
		};
		viewportService = {
			getStage: vi.fn(() => stage),
		};

		manager = new ShapeManager();
		Object.assign(manager, {
			viewportService: viewportService as unknown as IViewportService,
		});
	});

	describe('setShape', () => {
		it('保存图形并默认添加到舞台', () => {
			const shape = createShape('shape-1');

			manager.setShape(shape as unknown as BaseShape);

			expect(viewportService.getStage).toHaveBeenCalledOnce();
			expect(stage.appendShape).toHaveBeenCalledWith(shape.container);
			expect(manager.getShapeById(shape.id)).toBe(shape);
			expect(manager.getAllShapes()).toEqual([shape]);
		});

		it('appendToStage 为 false 时只保存图形', () => {
			const shape = createShape('shape-1');

			manager.setShape(shape as unknown as BaseShape, false);

			expect(viewportService.getStage).not.toHaveBeenCalled();
			expect(stage.appendShape).not.toHaveBeenCalled();
			expect(manager.getShapeById(shape.id)).toBe(shape);
		});
	});

	describe('getShapeByPoint', () => {
		it('将 viewport 坐标转换为图形本地坐标并返回首个命中图形', () => {
			const missedShape = createShape('missed');
			const matchedShape = createShape('matched', true);
			const uncheckedShape = createShape('unchecked', true);
			missedShape.container.toLocal.mockReturnValue({ x: 1, y: 2 });
			matchedShape.container.toLocal.mockReturnValue({ x: 3, y: 4 });
			manager.setShape(missedShape as unknown as BaseShape, false);
			manager.setShape(matchedShape as unknown as BaseShape, false);
			manager.setShape(uncheckedShape as unknown as BaseShape, false);

			const result = manager.getShapeByPoint({ x: 20, y: 30 });

			expect(stage.getViewport).toHaveBeenCalledOnce();
			expect(missedShape.container.toLocal).toHaveBeenCalledWith(
				expect.objectContaining({ x: 20, y: 30 }),
				viewport,
			);
			expect(missedShape.containsPoint).toHaveBeenCalledWith({ x: 1, y: 2 });
			expect(matchedShape.containsPoint).toHaveBeenCalledWith({ x: 3, y: 4 });
			expect(uncheckedShape.container.toLocal).not.toHaveBeenCalled();
			expect(result).toBe(matchedShape);
		});

		it('没有图形命中时返回 undefined', () => {
			const shape = createShape('shape-1');
			manager.setShape(shape as unknown as BaseShape, false);

			expect(manager.getShapeByPoint({ x: 20, y: 30 })).toBeUndefined();
		});
	});

	describe('removeShape', () => {
		it('从舞台和管理器中删除已存在的图形', () => {
			const shape = createShape('shape-1');
			manager.setShape(shape as unknown as BaseShape, false);

			manager.removeShape(shape.id);

			expect(stage.removeShape).toHaveBeenCalledWith(shape.container);
			expect(manager.getShapeById(shape.id)).toBeUndefined();
			expect(shape.container.destroy).not.toHaveBeenCalled();
		});

		it('删除不存在的图形时不访问舞台', () => {
			manager.removeShape('missing');

			expect(viewportService.getStage).not.toHaveBeenCalled();
			expect(stage.removeShape).not.toHaveBeenCalled();
		});
	});

	describe('clearShapes', () => {
		it('从舞台移除并销毁全部图形，然后清空集合', () => {
			const firstShape = createShape('shape-1');
			const secondShape = createShape('shape-2');
			manager.setShape(firstShape as unknown as BaseShape, false);
			manager.setShape(secondShape as unknown as BaseShape, false);

			manager.clearShapes();

			expect(stage.removeShape).toHaveBeenCalledTimes(2);
			expect(stage.removeShape).toHaveBeenCalledWith(firstShape.container);
			expect(stage.removeShape).toHaveBeenCalledWith(secondShape.container);
			expect(firstShape.container.destroy).toHaveBeenCalledWith({ children: true });
			expect(secondShape.container.destroy).toHaveBeenCalledWith({ children: true });
			expect(manager.getAllShapes()).toEqual([]);
		});
	});
});
