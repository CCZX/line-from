import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { BaseShape } from '@/shape/BaseShape';
import type { IViewportService } from '@/domain/contract';
import { ShapeManager } from '@/domain/service/ShapeManager';
import { ShapeTypeEnum } from '@/shape/contract';

interface ShapeMock {
	id: string;
	type: ShapeTypeEnum;
	container: {
		x: number;
		y: number;
		angle: number;
		toLocal: Mock;
		destroy: Mock;
	};
	getBounds: Mock;
	getWorldBounds: Mock;
	containsPoint: Mock;
	distanceToPoint: Mock;
}

function createShape(id: string, containsPoint = false, x = 0, y = 0): ShapeMock {
	const container = {
		x,
		y,
		angle: 0,
		toLocal: vi.fn(() => ({ x: 0, y: 0 })),
		destroy: vi.fn(),
	};
	const shape: ShapeMock = {
		id,
		type: ShapeTypeEnum.Rectangle,
		container,
		getBounds: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
		getWorldBounds: vi.fn(() => ({
			x: container.x - 50,
			y: container.y - 50,
			width: 100,
			height: 100,
		})),
		containsPoint: vi.fn(() => containsPoint),
		distanceToPoint: vi.fn(() => Infinity),
	};
	return shape;
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
		it('按从上到下的顺序转换本地坐标并返回首个命中图形', () => {
			const uncheckedShape = createShape('unchecked', true);
			const matchedShape = createShape('matched', true);
			const missedShape = createShape('missed');
			missedShape.container.toLocal.mockReturnValue({ x: 1, y: 2 });
			matchedShape.container.toLocal.mockReturnValue({ x: 3, y: 4 });
			manager.setShape(uncheckedShape as unknown as BaseShape, false);
			manager.setShape(matchedShape as unknown as BaseShape, false);
			manager.setShape(missedShape as unknown as BaseShape, false);

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

		it('重叠图形命中时返回最后加入舞台的最上层图形', () => {
			const bottomShape = createShape('bottom', true);
			const topShape = createShape('top', true);

			manager.setShape(bottomShape as unknown as BaseShape, false);
			manager.setShape(topShape as unknown as BaseShape, false);

			const result = manager.getShapeByPoint({ x: 10, y: 20 });

			expect(result).toBe(topShape);
			expect(topShape.container.toLocal).toHaveBeenCalledOnce();
			expect(bottomShape.container.toLocal).not.toHaveBeenCalled();
		});

		it('没有图形命中时返回 undefined', () => {
			const shape = createShape('shape-1');
			manager.setShape(shape as unknown as BaseShape, false);

			expect(manager.getShapeByPoint({ x: 20, y: 30 })).toBeUndefined();
		});

		it('只对四叉树返回的候选图形执行精确命中检测', () => {
			const farShape = createShape('far', true, 1000, 1000);
			const nearShape = createShape('near', true);
			manager.setShape(farShape as unknown as BaseShape, false);
			manager.setShape(nearShape as unknown as BaseShape, false);

			expect(manager.getShapeByPoint({ x: 0, y: 0 })).toBe(nearShape);
			expect(farShape.container.toLocal).not.toHaveBeenCalled();
		});

		it('过滤不可连接的上层图形后继续命中下层图形', () => {
			const targetShape = createShape('target', true);
			const coveringShape = createShape('covering', true);
			manager.setShape(targetShape as unknown as BaseShape, false);
			manager.setShape(coveringShape as unknown as BaseShape, false);

			const result = manager.getShapeByPoint(
				{ x: 0, y: 0 },
				{ filter: (shape) => shape.id !== coveringShape.id },
			);

			expect(result).toBe(targetShape);
			expect(coveringShape.container.toLocal).not.toHaveBeenCalled();
		});

		it('在扩展命中距离内吸附到最近图形', () => {
			const fartherShape = createShape('farther');
			const nearerShape = createShape('nearer');
			fartherShape.distanceToPoint.mockReturnValue(10);
			nearerShape.distanceToPoint.mockReturnValue(5);
			manager.setShape(fartherShape as unknown as BaseShape, false);
			manager.setShape(nearerShape as unknown as BaseShape, false);

			const result = manager.getShapeByPoint({ x: 55, y: 0 }, { hitSlop: 12 });

			expect(result).toBe(nearerShape);
			expect(fartherShape.distanceToPoint).toHaveBeenCalledOnce();
			expect(nearerShape.distanceToPoint).toHaveBeenCalledOnce();
		});

		it('扩展命中距离外不返回图形', () => {
			const shape = createShape('shape-1');
			shape.distanceToPoint.mockReturnValue(13);
			manager.setShape(shape as unknown as BaseShape, false);

			expect(manager.getShapeByPoint({ x: 55, y: 0 }, { hitSlop: 12 })).toBeUndefined();
		});
	});

	describe('空间区域索引', () => {
		it('图形更新后从旧区域移动到新区域', () => {
			const shape = createShape('shape-1');
			manager.setShape(shape as unknown as BaseShape, false);

			expect(manager.getShapesByRect({ x: -10, y: -10, width: 20, height: 20 })).toEqual([shape]);

			shape.container.x = 500;
			shape.container.y = 500;
			manager.refreshShapeIndex(shape.id);

			expect(manager.getShapesByRect({ x: -10, y: -10, width: 20, height: 20 })).toEqual([]);
			expect(manager.getShapesByRect({ x: 490, y: 490, width: 20, height: 20 })).toEqual([shape]);
		});

		it('删除和清空图形时同步清理空间索引', () => {
			const firstShape = createShape('shape-1');
			const secondShape = createShape('shape-2', false, 300, 300);
			manager.setShape(firstShape as unknown as BaseShape, false);
			manager.setShape(secondShape as unknown as BaseShape, false);

			manager.removeShape(firstShape.id);
			expect(manager.getShapesByRect({ x: -50, y: -50, width: 100, height: 100 })).toEqual([]);

			manager.clearShapes();
			expect(manager.getShapesByRect({ x: 250, y: 250, width: 100, height: 100 })).toEqual([]);
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
