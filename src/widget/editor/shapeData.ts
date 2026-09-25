import {
	type LineEndpointValue,
	type ShapeData,
	ShapeTypeEnum,
	type TextPropertyValue,
} from '@lineform/shape/contract';

const COLORS = {
	text: 0x1e293b,
	mutedText: 0x64748b,
	line: 0x64748b,
	blue: 0x2563eb,
	blueFill: 0xdbeafe,
	indigo: 0x4f46e5,
	indigoFill: 0xe0e7ff,
	purple: 0x9333ea,
	purpleFill: 0xf3e8ff,
	orange: 0xea580c,
	orangeFill: 0xffedd5,
	green: 0x16a34a,
	greenFill: 0xdcfce7,
	amber: 0xd97706,
	amberFill: 0xfef3c7,
	red: 0xdc2626,
	redFill: 0xfee2e2,
} as const;

const HANDWRITTEN_FONT = "'Comic Sans MS', 'Bradley Hand', cursive";

interface NodeOptions {
	id: string;
	type: ShapeTypeEnum;
	x: number;
	y: number;
	width: number;
	height: number;
	text: string;
	fill: number;
	stroke: number;
	style?: 'regular' | 'sketchy';
	seed?: number;
	fontFamily?: string;
}

function createNode(options: NodeOptions): ShapeData {
	const isSketchy = options.style === 'sketchy';

	return {
		id: options.id,
		type: options.type,
		properties: {
			base: {
				x: options.x,
				y: options.y,
				width: options.width,
				height: options.height,
			},
			fill: {
				color: options.fill,
				alpha: 1,
				style: isSketchy ? 'sketchy' : 'solid',
				seed: isSketchy ? options.seed : undefined,
			},
			stroke: {
				color: options.stroke,
				width: 2,
				alpha: 1,
				style: isSketchy ? 'sketchy' : 'regular',
				seed: isSketchy && options.seed !== undefined ? options.seed + 1 : undefined,
			},
			text: {
				text: options.text,
				color: COLORS.text,
				fontSize: 17,
				fontWeight: 'bold',
				horizontalAlign: 'center',
				verticalAlign: 'middle',
				lineHeight: 24,
				padding: 12,
				fontFamily: options.fontFamily,
			},
		},
	};
}

function createSketchyNode(options: Omit<NodeOptions, 'style' | 'fontFamily'>): ShapeData {
	return createNode({
		...options,
		style: 'sketchy',
		fontFamily: HANDWRITTEN_FONT,
	});
}

function createText(
	id: string,
	text: string,
	x: number,
	y: number,
	width: number,
	height: number,
	textOptions: Omit<TextPropertyValue, 'text'> = {},
): ShapeData {
	return {
		id,
		type: ShapeTypeEnum.Text,
		properties: {
			base: { x, y, width, height },
			text: {
				text,
				color: COLORS.text,
				fontSize: 14,
				horizontalAlign: 'center',
				verticalAlign: 'middle',
				...textOptions,
			},
		},
	};
}

interface LineOptions {
	id: string;
	start: LineEndpointValue;
	end: LineEndpointValue;
	midPoints?: Point[];
	color?: number;
	style?: 'regular' | 'sketchy';
	seed?: number;
}

function createLine(options: LineOptions): ShapeData {
	const points = [options.start, ...(options.midPoints ?? []), options.end];
	const xs = points.map(({ x }) => x);
	const ys = points.map(({ y }) => y);
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	const maxX = Math.max(...xs);
	const maxY = Math.max(...ys);

	return {
		id: options.id,
		type: ShapeTypeEnum.Line,
		properties: {
			base: {
				x: minX,
				y: minY,
				width: maxX - minX,
				height: maxY - minY,
			},
			stroke: {
				color: options.color ?? COLORS.line,
				width: 2,
				alpha: 1,
				style: options.style ?? 'regular',
				seed: options.style === 'sketchy' ? options.seed : undefined,
			},
			line: {
				start: options.start,
				end: options.end,
				midPoints: options.midPoints,
				routing: options.midPoints ? 'curved' : 'straight',
				endArrow: true,
			},
		},
	};
}

function createSketchyLine(options: Omit<LineOptions, 'style'>): ShapeData {
	return createLine({ ...options, style: 'sketchy' });
}

/** AgentLoop：目标驱动的感知、规划、执行、观察与反思闭环。 */
export const MOCK_SHAPE_DATA: ShapeData[] = [
	// 连线放在节点之前，使箭头始终位于节点下层。
	createLine({
		id: 'agent-loop-goal-to-perceive',
		start: { x: 160, y: 300, shapeId: 'agent-loop-goal', anchor: 'right' },
		end: { x: 220, y: 300, shapeId: 'agent-loop-perceive', anchor: 'left' },
		color: COLORS.blue,
	}),
	createLine({
		id: 'agent-loop-perceive-to-plan',
		start: { x: 380, y: 300, shapeId: 'agent-loop-perceive', anchor: 'right' },
		end: { x: 450, y: 300, shapeId: 'agent-loop-plan', anchor: 'left' },
		color: COLORS.blue,
	}),
	createLine({
		id: 'agent-loop-plan-to-act',
		start: { x: 620, y: 300, shapeId: 'agent-loop-plan', anchor: 'right' },
		end: { x: 690, y: 300, shapeId: 'agent-loop-act', anchor: 'left' },
		color: COLORS.blue,
	}),
	createLine({
		id: 'agent-loop-act-to-observe',
		start: { x: 860, y: 300, shapeId: 'agent-loop-act', anchor: 'right' },
		end: { x: 930, y: 300, shapeId: 'agent-loop-observe', anchor: 'left' },
		color: COLORS.blue,
	}),
	createLine({
		id: 'agent-loop-observe-to-decide',
		start: { x: 1100, y: 300, shapeId: 'agent-loop-observe', anchor: 'right' },
		end: { x: 1170, y: 300, shapeId: 'agent-loop-decide', anchor: 'left' },
		color: COLORS.blue,
	}),
	createLine({
		id: 'agent-loop-decide-to-output',
		start: { x: 1255, y: 370, shapeId: 'agent-loop-decide', anchor: 'bottom' },
		end: { x: 1255, y: 500, shapeId: 'agent-loop-output', anchor: 'top' },
		color: COLORS.green,
	}),
	createLine({
		id: 'agent-loop-decide-to-reflect',
		start: { x: 1255, y: 370, shapeId: 'agent-loop-decide', anchor: 'bottom' },
		end: { x: 1090, y: 550, shapeId: 'agent-loop-reflect', anchor: 'right' },
		midPoints: [{ x: 1190, y: 465 }],
		color: COLORS.red,
	}),
	createLine({
		id: 'agent-loop-reflect-to-memory',
		start: { x: 900, y: 550, shapeId: 'agent-loop-reflect', anchor: 'left' },
		end: { x: 830, y: 550, shapeId: 'agent-loop-memory', anchor: 'right' },
		color: COLORS.purple,
	}),
	createLine({
		id: 'agent-loop-memory-to-plan',
		start: { x: 640, y: 550, shapeId: 'agent-loop-memory', anchor: 'left' },
		end: { x: 535, y: 360, shapeId: 'agent-loop-plan', anchor: 'bottom' },
		midPoints: [{ x: 535, y: 455 }],
		color: COLORS.purple,
	}),

	createNode({
		id: 'agent-loop-goal',
		type: ShapeTypeEnum.Circle,
		x: 80,
		y: 260,
		width: 80,
		height: 80,
		text: '目标',
		fill: COLORS.blueFill,
		stroke: COLORS.blue,
	}),
	createNode({
		id: 'agent-loop-perceive',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 220,
		y: 250,
		width: 160,
		height: 100,
		text: '感知环境\n读取上下文',
		fill: COLORS.indigoFill,
		stroke: COLORS.indigo,
	}),
	createNode({
		id: 'agent-loop-plan',
		type: ShapeTypeEnum.Rectangle,
		x: 450,
		y: 240,
		width: 170,
		height: 120,
		text: '规划下一步\n选择策略',
		fill: COLORS.purpleFill,
		stroke: COLORS.purple,
	}),
	createNode({
		id: 'agent-loop-act',
		type: ShapeTypeEnum.Rectangle,
		x: 690,
		y: 240,
		width: 170,
		height: 120,
		text: '执行动作\n调用工具',
		fill: COLORS.orangeFill,
		stroke: COLORS.orange,
	}),
	createNode({
		id: 'agent-loop-observe',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 930,
		y: 250,
		width: 170,
		height: 100,
		text: '观察结果\n更新状态',
		fill: COLORS.amberFill,
		stroke: COLORS.amber,
	}),
	createNode({
		id: 'agent-loop-decide',
		type: ShapeTypeEnum.Diamond,
		x: 1170,
		y: 230,
		width: 170,
		height: 140,
		text: '目标\n完成？',
		fill: COLORS.greenFill,
		stroke: COLORS.green,
	}),
	createNode({
		id: 'agent-loop-reflect',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 900,
		y: 500,
		width: 190,
		height: 100,
		text: '反思与校正\n诊断偏差',
		fill: COLORS.redFill,
		stroke: COLORS.red,
	}),
	createNode({
		id: 'agent-loop-memory',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 640,
		y: 500,
		width: 190,
		height: 100,
		text: '更新记忆\n沉淀经验',
		fill: COLORS.purpleFill,
		stroke: COLORS.purple,
	}),
	createNode({
		id: 'agent-loop-output',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 1175,
		y: 500,
		width: 160,
		height: 80,
		text: '输出结果',
		fill: COLORS.greenFill,
		stroke: COLORS.green,
	}),

	createText('agent-loop-title', 'AgentLoop 自主智能体执行循环', 350, 70, 720, 44, {
		fontSize: 28,
		fontWeight: 'bold',
		color: COLORS.text,
	}),
	createText(
		'agent-loop-subtitle',
		'Goal → Perceive → Plan → Act → Observe → Reflect',
		350,
		120,
		720,
		28,
		{ fontSize: 14, color: COLORS.mutedText },
	),
	createText('agent-loop-label-done', '是', 1265, 420, 36, 24, {
		fontSize: 14,
		fontWeight: 'bold',
		color: COLORS.green,
	}),
	createText('agent-loop-label-continue', '否', 1135, 420, 36, 24, {
		fontSize: 14,
		fontWeight: 'bold',
		color: COLORS.red,
	}),
	createText('agent-loop-label-feedback', '反馈循环', 555, 440, 100, 24, {
		fontSize: 14,
		fontWeight: 'bold',
		color: COLORS.purple,
	}),

	// 手绘版 AgentLoop，整体位于标准版下方。
	createSketchyLine({
		id: 'sketch-agent-loop-goal-to-perceive',
		start: { x: 160, y: 950, shapeId: 'sketch-agent-loop-goal', anchor: 'right' },
		end: { x: 220, y: 950, shapeId: 'sketch-agent-loop-perceive', anchor: 'left' },
		color: COLORS.blue,
		seed: 2001,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-perceive-to-plan',
		start: { x: 380, y: 950, shapeId: 'sketch-agent-loop-perceive', anchor: 'right' },
		end: { x: 450, y: 950, shapeId: 'sketch-agent-loop-plan', anchor: 'left' },
		color: COLORS.blue,
		seed: 2002,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-plan-to-act',
		start: { x: 620, y: 950, shapeId: 'sketch-agent-loop-plan', anchor: 'right' },
		end: { x: 690, y: 950, shapeId: 'sketch-agent-loop-act', anchor: 'left' },
		color: COLORS.blue,
		seed: 2003,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-act-to-observe',
		start: { x: 860, y: 950, shapeId: 'sketch-agent-loop-act', anchor: 'right' },
		end: { x: 930, y: 950, shapeId: 'sketch-agent-loop-observe', anchor: 'left' },
		color: COLORS.blue,
		seed: 2004,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-observe-to-decide',
		start: { x: 1100, y: 950, shapeId: 'sketch-agent-loop-observe', anchor: 'right' },
		end: { x: 1170, y: 950, shapeId: 'sketch-agent-loop-decide', anchor: 'left' },
		color: COLORS.blue,
		seed: 2005,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-decide-to-output',
		start: { x: 1255, y: 1020, shapeId: 'sketch-agent-loop-decide', anchor: 'bottom' },
		end: { x: 1255, y: 1150, shapeId: 'sketch-agent-loop-output', anchor: 'top' },
		color: COLORS.green,
		seed: 2006,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-decide-to-reflect',
		start: { x: 1255, y: 1020, shapeId: 'sketch-agent-loop-decide', anchor: 'bottom' },
		end: { x: 1090, y: 1200, shapeId: 'sketch-agent-loop-reflect', anchor: 'right' },
		midPoints: [{ x: 1190, y: 1115 }],
		color: COLORS.red,
		seed: 2007,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-reflect-to-memory',
		start: { x: 900, y: 1200, shapeId: 'sketch-agent-loop-reflect', anchor: 'left' },
		end: { x: 830, y: 1200, shapeId: 'sketch-agent-loop-memory', anchor: 'right' },
		color: COLORS.purple,
		seed: 2008,
	}),
	createSketchyLine({
		id: 'sketch-agent-loop-memory-to-plan',
		start: { x: 640, y: 1200, shapeId: 'sketch-agent-loop-memory', anchor: 'left' },
		end: { x: 535, y: 1010, shapeId: 'sketch-agent-loop-plan', anchor: 'bottom' },
		midPoints: [{ x: 535, y: 1105 }],
		color: COLORS.purple,
		seed: 2009,
	}),

	createSketchyNode({
		id: 'sketch-agent-loop-goal',
		type: ShapeTypeEnum.Circle,
		x: 80,
		y: 910,
		width: 80,
		height: 80,
		text: '目标',
		fill: COLORS.blueFill,
		stroke: COLORS.blue,
		seed: 3001,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-perceive',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 220,
		y: 900,
		width: 160,
		height: 100,
		text: '感知环境\n读取上下文',
		fill: COLORS.indigoFill,
		stroke: COLORS.indigo,
		seed: 3002,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-plan',
		type: ShapeTypeEnum.Rectangle,
		x: 450,
		y: 890,
		width: 170,
		height: 120,
		text: '规划下一步\n选择策略',
		fill: COLORS.purpleFill,
		stroke: COLORS.purple,
		seed: 3003,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-act',
		type: ShapeTypeEnum.Rectangle,
		x: 690,
		y: 890,
		width: 170,
		height: 120,
		text: '执行动作\n调用工具',
		fill: COLORS.orangeFill,
		stroke: COLORS.orange,
		seed: 3004,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-observe',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 930,
		y: 900,
		width: 170,
		height: 100,
		text: '观察结果\n更新状态',
		fill: COLORS.amberFill,
		stroke: COLORS.amber,
		seed: 3005,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-decide',
		type: ShapeTypeEnum.Diamond,
		x: 1170,
		y: 880,
		width: 170,
		height: 140,
		text: '目标\n完成？',
		fill: COLORS.greenFill,
		stroke: COLORS.green,
		seed: 3006,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-reflect',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 900,
		y: 1150,
		width: 190,
		height: 100,
		text: '反思与校正\n诊断偏差',
		fill: COLORS.redFill,
		stroke: COLORS.red,
		seed: 3007,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-memory',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 640,
		y: 1150,
		width: 190,
		height: 100,
		text: '更新记忆\n沉淀经验',
		fill: COLORS.purpleFill,
		stroke: COLORS.purple,
		seed: 3008,
	}),
	createSketchyNode({
		id: 'sketch-agent-loop-output',
		type: ShapeTypeEnum.RoundedRectangle,
		x: 1175,
		y: 1150,
		width: 160,
		height: 80,
		text: '输出结果',
		fill: COLORS.greenFill,
		stroke: COLORS.green,
		seed: 3009,
	}),

	createText('sketch-agent-loop-title', 'AgentLoop · 手绘思考闭环', 350, 720, 720, 44, {
		fontSize: 28,
		fontWeight: 'bold',
		fontFamily: HANDWRITTEN_FONT,
		color: COLORS.text,
	}),
	createText(
		'sketch-agent-loop-subtitle',
		'感知 · 思考 · 行动 · 复盘 · 再迭代',
		350,
		770,
		720,
		28,
		{ fontSize: 15, fontFamily: HANDWRITTEN_FONT, color: COLORS.mutedText },
	),
	createText('sketch-agent-loop-label-done', '是', 1265, 1070, 36, 24, {
		fontSize: 14,
		fontWeight: 'bold',
		fontFamily: HANDWRITTEN_FONT,
		color: COLORS.green,
	}),
	createText('sketch-agent-loop-label-continue', '否', 1135, 1070, 36, 24, {
		fontSize: 14,
		fontWeight: 'bold',
		fontFamily: HANDWRITTEN_FONT,
		color: COLORS.red,
	}),
	createText('sketch-agent-loop-label-feedback', '反馈循环', 555, 1090, 100, 24, {
		fontSize: 14,
		fontWeight: 'bold',
		fontFamily: HANDWRITTEN_FONT,
		color: COLORS.purple,
	}),
];
