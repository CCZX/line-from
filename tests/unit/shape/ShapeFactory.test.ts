import { describe, expect, it, vi } from 'vitest';
import type { IocContainerService } from '@lineform/common/contract';
import { Circle } from '@lineform/shape/Circle';
import { Diamond } from '@lineform/shape/Diamond';
import { Line } from '@lineform/shape/Line';
import { Rectangle } from '@lineform/shape/Rectangle';
import { RoundedRectangle } from '@lineform/shape/RoundedRectangle';
import { createShapeFromData } from '@lineform/shape/ShapeFactory';
import { Text } from '@lineform/shape/Text';
import { ShapePropertyEnum, ShapeTypeEnum, type ShapeData } from '@lineform/shape/contract';

function shapeModule(className: string) {
	return {
		[className]: class {
			public id: string;
			public setProperty = vi.fn();

			constructor(id: string) {
				this.id = id;
			}
		},
	};
}

vi.mock('@lineform/shape/Circle', () => shapeModule('Circle'));
vi.mock('@lineform/shape/Rectangle', () => shapeModule('Rectangle'));
vi.mock('@lineform/shape/RoundedRectangle', () => shapeModule('RoundedRectangle'));
vi.mock('@lineform/shape/Diamond', () => shapeModule('Diamond'));
vi.mock('@lineform/shape/Text', () => shapeModule('Text'));
vi.mock('@lineform/shape/Line', () => shapeModule('Line'));

const CONSTRUCTORS = {
	[ShapeTypeEnum.Circle]: Circle,
	[ShapeTypeEnum.Rectangle]: Rectangle,
	[ShapeTypeEnum.RoundedRectangle]: RoundedRectangle,
	[ShapeTypeEnum.Diamond]: Diamond,
	[ShapeTypeEnum.Text]: Text,
	[ShapeTypeEnum.Line]: Line,
};

describe('ShapeFactory', () => {
	it.each(Object.values(ShapeTypeEnum))('集中创建并初始化 %s 图形', (type) => {
		const ioc = {} as IocContainerService;
		const data: ShapeData = {
			id: `shape-${type}`,
			type,
			properties: {
				base: { x: 10, y: 20, width: 100, height: 100 },
				...(type === ShapeTypeEnum.Line
					? { line: { start: { x: 10, y: 20 }, end: { x: 110, y: 120 } } }
					: {}),
			},
		};

		const shape = createShapeFromData(data, { ioc });

		expect(shape).toBeInstanceOf(CONSTRUCTORS[type]);
		expect(shape?.id).toBe(data.id);
		expect(shape?.setProperty).toHaveBeenCalledWith(ShapePropertyEnum.Base, {
			x: 10,
			y: 20,
			width: 100,
			height: 100,
		});
		if (type === ShapeTypeEnum.Line) {
			expect(shape?.setProperty).toHaveBeenCalledWith(ShapePropertyEnum.Line, data.properties.line);
		}
	});
});
