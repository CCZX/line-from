import { useState, useCallback, useMemo } from 'react';
import { IActionLogManager, ToolType, IToolService } from '@/domain/contract';
import { useInject } from '@/common/context';
import { RoughGenerator } from 'roughjs/bin/generator';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@/i18n';
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
	undo: 'M9.5 4.8 L5 8.2 L9.5 11.6 M5.4 8.2 L12.4 8.2 C16.5 8.2 19.3 10.6 19.3 14.1 C19.3 17.4 16.7 19.6 13.4 19.6 C10.5 19.6 8.2 18.3 6.7 16.1',
	redo: 'M14.5 4.8 L19 8.2 L14.5 11.6 M18.6 8.2 L11.6 8.2 C7.5 8.2 4.7 10.6 4.7 14.1 C4.7 17.4 7.3 19.6 10.6 19.6 C13.5 19.6 15.8 18.3 17.3 16.1',
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
		const isHistoryIcon = name === 'undo' || name === 'redo';
		const drawable = generator.path(ICON_PATHS[name], {
			stroke: 'currentColor',
			strokeWidth: isHistoryIcon ? 1.55 : 1.25,
			roughness: isHistoryIcon ? 0.38 : 0.62,
			bowing: isHistoryIcon ? 0.45 : 0.7,
			maxRandomnessOffset: isHistoryIcon ? 0.28 : 0.48,
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
	const { t, i18n } = useTranslation();
	const toolService = useInject<IToolService>(IToolService);
	const actionLogManager = useInject<IActionLogManager>(IActionLogManager);
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

	const handleUndo = useCallback(() => {
		actionLogManager.undo();
	}, [actionLogManager]);

	const handleRedo = useCallback(() => {
		actionLogManager.redo();
	}, [actionLogManager]);

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
		<nav id='toolbar' aria-label={t('toolbar.label')}>
			{/* Undo / Redo */}
			<div className='tb-group'>
				<ActionButton title={t('toolbar.undo')} onClick={handleUndo}>
					<SketchIcon name='undo' />
				</ActionButton>
				<ActionButton title={t('toolbar.redo')} onClick={handleRedo}>
					<SketchIcon name='redo' />
				</ActionButton>
			</div>

			<div className='tb-sep' />

			{/* Tools */}
			<div className='tb-group'>
				<ToolButton tool={ToolType.Select} title={t('toolbar.select')}>
					<SketchIcon name='select' />
				</ToolButton>
				<ToolButton tool={ToolType.Rect} title={t('toolbar.rect')}>
					<SketchIcon name='rect' />
				</ToolButton>
				<ToolButton tool={ToolType.Circle} title={t('toolbar.circle')}>
					<SketchIcon name='circle' />
				</ToolButton>
				<ToolButton tool={ToolType.Line} title={t('toolbar.line')}>
					<SketchIcon name='line' />
				</ToolButton>
				<ToolButton tool={ToolType.Arrow} title={t('toolbar.arrow')}>
					<SketchIcon name='arrow' />
				</ToolButton>
				<ToolButton tool={ToolType.Text} title={t('toolbar.text')}>
					<SketchIcon name='text' />
				</ToolButton>
			</div>

			<div className='tb-sep' />

			{/* Zoom */}
			<div className='zoom-wrap'>
				<ActionButton title={t('toolbar.zoomOut')} onClick={handleZoomOut}>
					<SketchIcon name='zoomOut' />
				</ActionButton>
				<span className='zoom-label' title={t('toolbar.zoomReset')} onClick={handleZoomReset}>
					{zoom}%
				</span>
				<ActionButton title={t('toolbar.zoomIn')} onClick={handleZoomIn}>
					<SketchIcon name='zoomIn' />
				</ActionButton>
			</div>

			<div className='tb-sep' />

			<select
				className='language-select'
				value={i18n.resolvedLanguage ?? i18n.language}
				title={t('language.label')}
				aria-label={t('language.label')}
				onChange={(event) => void i18n.changeLanguage(event.target.value as Locale)}
			>
				<option value='zh-CN'>{t('language.zhCN')}</option>
				<option value='en'>{t('language.en')}</option>
			</select>
		</nav>
	);
}
