import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { BaseShape } from '@/shape/BaseShape';
import { ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { SelectedBorder } from '@/shape/decorate/SelectedBorder';
import type { DecorateViewport } from '@/shape/decorate/AbsDecorate';

vi.mock('@pixi/graphics', () => {
	class GraphicsMock {
		public name = '';
		public geometry: {
			graphicsData: Array<{
				shape: { radius?: number };
				lineStyle: { width: number };
			}>;
		} = { graphicsData: [] };
		private currentLineWidth = 0;

		public clear(): this {
			this.geometry.graphicsData = [];
			return this;
		}

		public lineStyle(width: number): this {
			this.currentLineWidth = width;
			return this;
		}

		public beginFill(): this {
			return this;
		}

		public endFill(): this {
			return this;
		}

		public drawRect(): this {
			this.geometry.graphicsData.push({
				shape: {},
				lineStyle: { width: this.currentLineWidth },
			});
			return this;
		}

		public drawCircle(_x: number, _y: number, radius: number): this {
			this.geometry.graphicsData.push({
				shape: { radius },
				lineStyle: { width: this.currentLineWidth },
			});
			return this;
		}

		public moveTo(): this {
			return this;
		}

		public lineTo(): this {
			return this;
		}
	}

	return { Graphics: GraphicsMock };
});

describe('SelectedBorder', () => {
	let scale: number;
	let scaleListener: ((scale: number) => void) | null;
	let unsubscribe: Mock;
	let addChild: Mock;
	let removeChild: Mock;
	let border: SelectedBorder;

	beforeEach(() => {
		scale = 1;
		scaleListener = null;
		unsubscribe = vi.fn();
		addChild = vi.fn();
		removeChild = vi.fn();

		const shape = {
			type: ShapeTypeEnum.Rectangle,
			container: { addChild, removeChild },
			getBounds: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 80 })),
			getSelectionBorderInset: vi.fn(() => 0),
			getProperty: vi.fn((type: ShapePropertyEnum) => {
				if (type === ShapePropertyEnum.Stroke) {
					return { value: { width: 2 } };
				}
				return undefined;
			}),
		};
		const viewport: DecorateViewport = {
			getScale: vi.fn(() => scale),
			subscribe: vi.fn((listener: (nextScale: number) => void) => {
				scaleListener = listener;
				return unsubscribe;
			}),
		};

		border = new SelectedBorder(shape as unknown as BaseShape, viewport);
	});

	it('按 viewport 缩放反向补偿装饰器视觉尺寸', () => {
		border.onActivate();

		expect(border.getHandleBounds()).toEqual({
			left: -3,
			top: -3,
			right: 103,
			bottom: 83,
		});
		expect(border.getRotateHandleCenter()).toEqual({ x: 50, y: -19 });
		expect(getFirstCircleRadius()).toBe(5);
		expect(getBorderLineWidth()).toBe(1);

		scale = 2;
		scaleListener?.(scale);

		expect(border.getHandleBounds()).toEqual({
			left: -2,
			top: -2,
			right: 102,
			bottom: 82,
		});
		expect(border.getRotateHandleCenter()).toEqual({ x: 50, y: -10 });
		expect(getFirstCircleRadius()).toBe(2.5);
		expect(getBorderLineWidth()).toBe(0.5);
	});

	it('停用装饰器时解除 viewport 缩放监听', () => {
		border.onActivate();

		expect(addChild).toHaveBeenCalledWith(border.graphics);

		border.onDeactivate();

		expect(unsubscribe).toHaveBeenCalledOnce();
		expect(removeChild).toHaveBeenCalledWith(border.graphics);
	});

	function getFirstCircleRadius(): number | undefined {
		return (
			border.graphics.geometry.graphicsData[1]?.shape as {
				radius?: number;
			}
		).radius;
	}

	function getBorderLineWidth(): number {
		return border.graphics.geometry.graphicsData[0]?.lineStyle.width;
	}
});
