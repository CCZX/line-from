import { useState, useCallback, useMemo } from 'react';
import { ToolType, IToolService } from '@/domain/contract';
import { useInject } from '@/common/context';
import { RoughGenerator } from 'roughjs/bin/generator';
import './index.less';

type SketchIconName =
	| 'undo'
	| 'redo'
	| 'select'
	| 'pen'
	| 'rect'
	| 'circle'
	| 'line'
	| 'arrow'
	| 'text'
	| 'eraser'
	| 'zoomOut'
	| 'zoomIn'
	| 'trash';

const ICON_PATHS: Record<SketchIconName, string> = {
	undo: 'M9 7 L4 7 L4 12 M4 7 C7 4.5 11 3.5 15 5 C19 6.5 21 10 20 14 C19 17.5 16 19.5 12 19',
	redo: 'M15 7 L20 7 L20 12 M20 7 C17 4.5 13 3.5 9 5 C5 6.5 3 10 4 14 C5 17.5 8 19.5 12 19',
	select: 'M5 3.5 L10.5 20 L13 13.5 L19.5 11 Z M13 13.5 L20 20.5',
	pen: 'M5 19 L7 14.5 L16.8 4.7 C17.7 3.8 19.1 3.8 20 4.7 C20.9 5.6 20.9 7 20 7.9 L10.2 17.7 Z M7 14.5 L10.2 17.7 M4 20 L13 20',
	rect: 'M4 5 C8 4.5 15.5 4.8 20 5.2 L19.7 19 C15 19.5 8.5 19.2 4.2 18.8 Z',
	circle:
		'M20 12 C20 16.7 16.5 20 12 20 C7.3 20 4 16.5 4 12 C4 7.4 7.5 4 12 4 C16.7 4 20 7.5 20 12 Z',
	line: 'M5 19 C9 15 14.8 9.2 19 5',
	arrow: 'M5 19 C9 15 14.8 9.2 19 5 M13 5 L19 5 L19 11',
	text: 'M5 7 L5 4.5 L19 4.5 L19 7 M12 4.5 L12 20 M8.5 20 L15.5 20',
	eraser:
		'M4.2 14.2 L14.5 3.9 C15.3 3.1 16.6 3.1 17.4 3.9 L20.1 6.6 C20.9 7.4 20.9 8.7 20.1 9.5 L10 19.6 C9.5 20.1 8.5 20.1 8 19.6 L4.2 15.8 C3.8 15.4 3.8 14.7 4.2 14.2 Z M12 18 L6 12',
	zoomOut:
		'M18 18 L21 21 M11 18 C7.1 18 4 14.9 4 11 C4 7.1 7.1 4 11 4 C14.9 4 18 7.1 18 11 C18 14.9 14.9 18 11 18 Z M8 11 L14 11',
	zoomIn:
		'M18 18 L21 21 M11 18 C7.1 18 4 14.9 4 11 C4 7.1 7.1 4 11 4 C14.9 4 18 7.1 18 11 C18 14.9 14.9 18 11 18 Z M8 11 L14 11 M11 8 L11 14',
	trash:
		'M5 7 L19 7 M9 7 L9 4.5 L15 4.5 L15 7 M7 7 L8 20 L16 20 L17 7 M10.5 10 L10.7 17 M13.5 10 L13.3 17',
};

const ICON_SEEDS: Record<SketchIconName, number> = {
	undo: 11,
	redo: 17,
	select: 23,
	pen: 29,
	rect: 31,
	circle: 37,
	line: 41,
	arrow: 43,
	text: 47,
	eraser: 53,
	zoomOut: 59,
	zoomIn: 61,
	trash: 67,
};

function SketchIcon({ name }: { name: SketchIconName }) {
	const paths = useMemo(() => {
		const generator = new RoughGenerator();
		const drawable = generator.path(ICON_PATHS[name], {
			stroke: 'currentColor',
			strokeWidth: 1.25,
			roughness: 0.62,
			bowing: 0.7,
			maxRandomnessOffset: 0.48,
			preserveVertices: true,
			seed: ICON_SEEDS[name],
			disableMultiStroke: false,
		});
		return generator.toPaths(drawable);
	}, [name]);

	return (
		<svg className='tb-icon' viewBox='0 0 24 24' aria-hidden='true'>
			{paths.map((path, index) => (
				<path
					key={`${name}-${index}`}
					d={path.d}
					fill='none'
					stroke='currentColor'
					strokeWidth={path.strokeWidth}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			))}
		</svg>
	);
}

export function Toolbar() {
	const toolService = useInject<IToolService>(IToolService);
	const activeTool = toolService.store((s) => s.activeTool);
	const setActiveTool = toolService.store((s) => s.setActiveTool);
	const [zoom, setZoom] = useState(100);

	const handleToolClick = useCallback(
		(tool: ToolType) => {
			setActiveTool(tool);
		},
		[setActiveTool],
	);

	const handleZoomIn = useCallback(() => {
		setZoom((z) => Math.round(Math.min(1000, z * 1.25)));
	}, []);

	const handleZoomOut = useCallback(() => {
		setZoom((z) => Math.round(Math.max(1, z / 1.25)));
	}, []);

	const handleZoomReset = useCallback(() => {
		setZoom(100);
	}, []);

	const ToolButton = ({
		tool,
		title,
		children,
	}: {
		tool: ToolType;
		title: string;
		children: React.ReactNode;
	}) => (
		<button
			type='button'
			className={`tb-button${activeTool === tool ? ' tb-button--active' : ''}`}
			title={title}
			aria-label={title}
			aria-pressed={activeTool === tool}
			onClick={() => handleToolClick(tool)}
		>
			<svg className='tb-button-frame' viewBox='0 0 40 40' aria-hidden='true'>
				<path d='M7 3.5 C15 2.7 28 3 34 4.2 C37 9 36.8 29 34.8 35 C27 37 12 36.8 5 35 C3 28 3.2 10 5.2 5 Z' />
				<path d='M6 4.6 C15 3.6 29 3.8 35 5 C36 13 36.2 28 34 34 C25 35.8 12 35.5 5.8 34 C4.2 25 4 12 6 4.6 Z' />
			</svg>
			{children}
		</button>
	);

	const ActionButton = ({
		title,
		children,
		onClick,
	}: {
		title: string;
		children: React.ReactNode;
		onClick?: () => void;
	}) => (
		<button type='button' className='tb-button' title={title} aria-label={title} onClick={onClick}>
			<svg className='tb-button-frame' viewBox='0 0 40 40' aria-hidden='true'>
				<path d='M7 3.5 C15 2.7 28 3 34 4.2 C37 9 36.8 29 34.8 35 C27 37 12 36.8 5 35 C3 28 3.2 10 5.2 5 Z' />
				<path d='M6 4.6 C15 3.6 29 3.8 35 5 C36 13 36.2 28 34 34 C25 35.8 12 35.5 5.8 34 C4.2 25 4 12 6 4.6 Z' />
			</svg>
			{children}
		</button>
	);

	return (
		<nav id='toolbar' aria-label='画布工具栏'>
			{/* Undo / Redo */}
			<div className='tb-group'>
				<ActionButton title='撤销 (Ctrl+Z)'>
					<SketchIcon name='undo' />
				</ActionButton>
				<ActionButton title='重做 (Ctrl+Shift+Z)'>
					<SketchIcon name='redo' />
				</ActionButton>
			</div>

			<div className='tb-sep' />

			{/* Tools */}
			<div className='tb-group'>
				<ToolButton tool={ToolType.Select} title='选择 (V)'>
					<SketchIcon name='select' />
				</ToolButton>
				<ToolButton tool={ToolType.Pen} title='画笔 (P)'>
					<SketchIcon name='pen' />
				</ToolButton>
				<ToolButton tool={ToolType.Rect} title='矩形 (R)'>
					<SketchIcon name='rect' />
				</ToolButton>
				<ToolButton tool={ToolType.Circle} title='圆形 (C)'>
					<SketchIcon name='circle' />
				</ToolButton>
				<ToolButton tool={ToolType.Line} title='直线 (L)'>
					<SketchIcon name='line' />
				</ToolButton>
				<ToolButton tool={ToolType.Arrow} title='箭头 (A)'>
					<SketchIcon name='arrow' />
				</ToolButton>
				<ToolButton tool={ToolType.Text} title='文字 (T)'>
					<SketchIcon name='text' />
				</ToolButton>
				<ToolButton tool={ToolType.Eraser} title='橡皮擦 (E)'>
					<SketchIcon name='eraser' />
				</ToolButton>
			</div>

			<div className='tb-sep' />

			{/* Zoom */}
			<div className='zoom-wrap'>
				<ActionButton title='缩小' onClick={handleZoomOut}>
					<SketchIcon name='zoomOut' />
				</ActionButton>
				<span className='zoom-label' title='重置缩放' onClick={handleZoomReset}>
					{zoom}%
				</span>
				<ActionButton title='放大' onClick={handleZoomIn}>
					<SketchIcon name='zoomIn' />
				</ActionButton>
			</div>

			<div className='tb-sep' />

			{/* Clear */}
			<ActionButton title='清空画布'>
				<SketchIcon name='trash' />
			</ActionButton>
		</nav>
	);
}
