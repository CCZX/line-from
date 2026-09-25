import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseShape } from '@lineform/shape/BaseShape';
import { ShapeTypeEnum } from '@lineform/shape/contract';
import { AlignmentSnapService } from '@lineform/domain/service/AlignmentSnap';

function createShape(
	id: string,
	x: number,
	y: number,
	width = 100,
	height = 100,
	type = ShapeTypeEnum.Rectangle,
): BaseShape {
	return {
		id,
		type,
		container: {
			x: x + width / 2,
			y: y + height / 2,
			angle: 0,
		},
		getBounds: () => ({ x: 0, y: 0, width, height }),
		getWorldBounds: BaseShape.prototype.getWorldBounds,
		supportsAlignmentSnap: type !== ShapeTypeEnum.Line,
	} as unknown as BaseShape;
}

describe('AlignmentSnapService', () => {
	let service: AlignmentSnapService;
	let candidates: BaseShape[];
	let scale: number;

	beforeEach(() => {
		candidates = [];
		scale = 1;
		service = new AlignmentSnapService();
		Object.assign(service, {
			shapeManager: {
				getShapesByRect: vi.fn(() => candidates),
			},
			viewportService: {
				store: {
					getState: () => ({ scale }),
				},
				getVisibleWorldRect: () => ({ x: -1000, y: -1000, width: 2000, height: 2000 }),
				getStage: vi.fn(),
			},
			renderer: { render: vi.fn(), clear: vi.fn() },
		});
	});

	it('将移动图形的边缘吸附到目标边缘并返回辅助线', () => {
		const moving = createShape('moving', 0, 0);
		const target = createShape('target', 105, 300);
		candidates = [moving, target];

		service.begin([moving]);
		const result = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 1,
		});

		expect(result.delta).toEqual({ x: 5, y: 0 });
		expect(result.guides).toEqual([expect.objectContaining({ axis: 'x', position: 105 })]);
	});

	it('吸附阈值按屏幕像素换算，不受画布缩放影响', () => {
		const moving = createShape('moving', 0, 0);
		const target = createShape('target', 108, 300);
		candidates = [moving, target];

		service.begin([moving]);
		const atOneHundredPercent = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 1,
		});
		expect(atOneHundredPercent.delta.x).toBe(0);

		service.end();
		scale = 0.5;
		service.begin([moving]);
		const atFiftyPercent = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 0.5,
		});
		expect(atFiftyPercent.delta.x).toBe(8);
	});

	it('距离相同时优先选择中心对中心吸附', () => {
		const moving = createShape('moving', 0, 0);
		const target = createShape('target', 6, 300);
		candidates = [moving, target];

		service.begin([moving]);
		const result = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 1,
		});

		expect(result.delta.x).toBe(6);
		expect(result.guides[0]).toEqual(expect.objectContaining({ axis: 'x', position: 56 }));
	});

	it('使用更大的退出阈值保持当前吸附，避免临界位置抖动', () => {
		const moving = createShape('moving', 0, 0);
		const target = createShape('target', 105, 300);
		candidates = [moving, target];
		service.begin([moving]);

		const acquired = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 1,
		});
		const retained = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 12, y: 0 },
			scale: 1,
		});
		const released = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 16, y: 0 },
			scale: 1,
		});

		expect(acquired.delta.x).toBe(5);
		expect(retained.delta.x).toBe(5);
		expect(released.delta.x).toBe(16);
	});

	it('排除选中图形和直线，并支持临时禁用吸附', () => {
		const moving = createShape('moving', 0, 0);
		const alsoMoving = createShape('also-moving', 105, 300);
		const line = createShape('line', 105, 300, 100, 100, ShapeTypeEnum.Line);
		candidates = [moving, alsoMoving, line];

		service.begin([moving, alsoMoving]);
		const withoutTargets = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 1,
		});
		expect(withoutTargets).toEqual({ delta: { x: 0, y: 0 }, guides: [] });

		service.end();
		candidates = [moving, createShape('target', 105, 300)];
		service.begin([moving]);
		const disabled = service.resolveMove({
			originBounds: { x: 0, y: 0, width: 100, height: 100 },
			rawDelta: { x: 0, y: 0 },
			scale: 1,
			disabled: true,
		});
		expect(disabled).toEqual({ delta: { x: 0, y: 0 }, guides: [] });
	});
});
