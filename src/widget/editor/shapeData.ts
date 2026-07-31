import { ShapeData } from '@/shape/contract';

export const MOCK_SHAPE_DATA = [
	{
		id: 'rectangle-2',
		type: 'rectangle',
		properties: {
			base: {
				x: 0,
				y: 0,
				width: 100,
				height: 100,
			},
			fill: {
				color: 1667522,
				alpha: 1,
				seed: 10190630,
				style: 'sketchy',
			},
			stroke: {
				color: 1973790,
				width: 1,
				alpha: 1,
				style: 'sketchy',
				seed: 564877243,
			},
			text: {
				text: '',
			},
		},
	},
	{
		id: 'line-1',
		type: 'line',
		properties: {
			base: {
				x: 120,
				y: 120,
				width: 160,
				height: 60,
			},
			fill: {
				color: 0,
				alpha: 1,
				style: 'solid',
			},
			stroke: {
				color: 16711680,
				width: 1,
				alpha: 1,
				style: 'sketchy',
				seed: 48278062,
			},
			line: {
				start: {
					x: 120,
					y: 120,
				},
				end: {
					x: 280,
					y: 180,
				},
				routing: 'straight',
				endArrow: true,
			},
		},
	},
	{
		id: 'text-1',
		type: 'text',
		properties: {
			base: {
				x: 300,
				y: 300,
				width: 200,
				height: 30,
			},
			fill: {
				color: 0,
				alpha: 1,
				style: 'solid',
			},
			stroke: {
				color: 0,
				width: 0,
				alpha: 1,
				style: 'regular',
			},
			text: {
				text: 'helloworld',
			},
		},
	},
	{
		id: 'shape-1-1785506795046',
		type: 'rectangle',
		properties: {
			base: {
				x: 600.70703125,
				y: 232.12109375,
				width: 168.578125,
				height: 179.0078125,
			},
			fill: {
				color: 3120708,
				alpha: 1,
				style: 'sketchy',
				seed: 466534137,
			},
			stroke: {
				color: 1973790,
				width: 1,
				alpha: 1,
				style: 'sketchy',
				seed: 751279491,
			},
			text: {
				text: '',
				color: 1973790,
				fontSize: 16,
				horizontalAlign: 'center',
				verticalAlign: 'middle',
				padding: 8,
			},
		},
	},
] as ShapeData[];
