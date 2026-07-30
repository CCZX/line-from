import { ShapeData, ShapeTypeEnum } from '@/shape/contract';

export const MOCK_SHAPE_DATA: ShapeData[] = [
	// {
	//   id: 'circle-1',
	//   type: ShapeTypeEnum.Circle,
	//   properties: {
	//     base: { x: 100, y: 100, width: 100, height: 100 },
	//     fill: { color: 0x0000ff, alpha: 1 },
	//   },
	// },

	// {
	//   id: 'circle-2',
	//   type: ShapeTypeEnum.Circle,
	//   properties: {
	//     base: { x: 500, y: 500, width: 100, height: 100 },
	//     fill: { color: 0x1ae70f, alpha: 1 },
	//   },
	// },

	{
		id: 'rectangle-2',
		type: ShapeTypeEnum.Rectangle,
		properties: {
			base: { x: 0, y: 0, width: 100, height: 100 },
			fill: { color: 0x1971c2, alpha: 1, seed: 0x9b7f26, style: 'sketchy' },
			stroke: { color: 0x1e1e1e, width: 1, alpha: 1, style: 'sketchy' },
		},
	},
	// {
	//   id: 'rectangle-2',
	//   type: ShapeTypeEnum.Rectangle,
	//   properties: {
	//     base: { x: 100, y: 300, width: 100, height: 100 },
	//     fill: { color: 0x1ae70f, alpha: 1 },
	//   },
	// },
	{
		id: 'line-1',
		type: ShapeTypeEnum.Line,
		properties: {
			base: { x: 120, y: 120, width: 160, height: 60 },
			stroke: { color: 0xff0000, width: 1, alpha: 1, style: 'sketchy' },
			line: {
				start: { x: 120, y: 120 },
				end: { x: 280, y: 180 },
				routing: 'straight',
				endArrow: true,
			},
		},
	},
	{
		id: 'text-1',
		type: ShapeTypeEnum.Text,
		properties: {
			base: { x: 300, y: 300, width: 200, height: 30 },
			text: { text: 'helloworld' },
		},
	},
];
