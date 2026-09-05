import { ShapeTypeEnum, type ShapeData } from '@/shape/contract';

export function createSingleRectangleFixture(): ShapeData[] {
	return [
		{
			id: 'e2e-rectangle',
			type: ShapeTypeEnum.Rectangle,
			properties: {
				base: {
					x: 450,
					y: 240,
					width: 170,
					height: 120,
				},
				fill: {
					color: 0xdbeafe,
					alpha: 1,
					style: 'solid',
				},
				stroke: {
					color: 0x2563eb,
					width: 2,
					alpha: 1,
					style: 'regular',
				},
				text: {
					text: '原始文字',
					color: 0x1e293b,
					fontSize: 17,
					fontWeight: 'bold',
					horizontalAlign: 'center',
					verticalAlign: 'middle',
					padding: 12,
				},
			},
		},
	];
}
