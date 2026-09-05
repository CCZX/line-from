import { describe, expect, it, vi } from 'vitest';
import type { EventPayload, InteractionState } from '@/domain/contract/EventManager';
import { TextEditHandler } from '@/domain/service/Events/modes/interaction/handlers/TextEditHandler';
import { Rectangle } from '@/shape/Rectangle';
import { ShapeStateEnum } from '@/shape/contract';

const state: InteractionState = { hoveredShape: null };
const payload: EventPayload = {
	viewportPoint: { x: 100, y: 120 },
	screenPoint: { x: 100, y: 120 },
	scale: 1,
};

describe('TextEditHandler', () => {
	it('未选中的文字图形可以通过连续两次 pointerdown 直接进入编辑态', () => {
		const setState = vi.fn();
		const pointerDown = vi.fn();
		const viewport = {};
		const shape = Object.assign(Object.create(Rectangle.prototype), {
			id: 'shape-1',
			container: {
				toLocal: vi.fn(() => ({ x: 50, y: 60 })),
			},
			getState: vi.fn(() => ShapeStateEnum.Selected),
			setState,
		}) as Rectangle;
		const getSelectedShapes = vi.fn().mockReturnValueOnce([]).mockReturnValue([shape]);
		const handler = new TextEditHandler();

		Object.assign(handler, {
			shapeManager: {
				getShapeByPoint: vi.fn(() => shape),
			},
			viewportService: {
				clientToViewportLocal: vi.fn(() => ({ x: 100, y: 120 })),
				getStage: vi.fn(() => ({ getViewport: () => viewport })),
			},
			selectService: { getSelectedShapes },
			selectionService: { isActive: vi.fn(() => false), pointerDown },
		});

		const firstEvent = {
			type: 'pointerdown',
			clientX: 100,
			clientY: 120,
			detail: 1,
			preventDefault: vi.fn(),
		} as unknown as PointerEvent;
		const secondEvent = {
			...firstEvent,
			preventDefault: vi.fn(),
		} as unknown as PointerEvent;

		expect(handler.execute(firstEvent, state, payload)).toBe(true);
		expect(handler.execute(secondEvent, state, payload)).toBe(false);
		expect(setState).toHaveBeenCalledWith(ShapeStateEnum.Edit);
		expect(pointerDown).toHaveBeenCalledWith(shape, { x: 50, y: 60 }, { selectWord: true });
		expect(secondEvent.preventDefault).toHaveBeenCalledOnce();
	});
});
