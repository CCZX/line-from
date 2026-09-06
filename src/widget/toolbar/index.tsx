import { useCallback, useMemo, useRef, type ChangeEvent, type ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Toast } from '@base-ui/react/toast';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { Tooltip } from '@base-ui/react/tooltip';
import {
	IActionLogManager,
	ToolType,
	IToolService,
	IShapeManager,
	ICanvasInitService,
	IViewportService,
} from '@/domain/contract';
import { useInject } from '@/common/context';
import { RoughGenerator } from 'roughjs/bin/generator';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@/i18n';
import { parseShapeDataJson } from './shapeDataJson';
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from '@/canvas/core/Viewport';
import { getShapesWorldBounds } from '@/domain/service/ShapeManager';
import './index.less';

type SketchIconName =
	| 'undo'
	| 'redo'
	| 'select'
	| 'pen'
	| 'rect'
	| 'roundedRect'
	| 'diamond'
	| 'circle'
	| 'line'
	| 'arrow'
	| 'text'
	| 'eraser'
	| 'zoomOut'
	| 'zoomIn'
	| 'zoomToFit'
	| 'upload'
	| 'download'
	| 'trash';

const ICON_PATHS: Record<SketchIconName, string> = {
	undo: 'M9.5 4.8 L5 8.2 L9.5 11.6 M5.4 8.2 L12.4 8.2 C16.5 8.2 19.3 10.6 19.3 14.1 C19.3 17.4 16.7 19.6 13.4 19.6 C10.5 19.6 8.2 18.3 6.7 16.1',
	redo: 'M14.5 4.8 L19 8.2 L14.5 11.6 M18.6 8.2 L11.6 8.2 C7.5 8.2 4.7 10.6 4.7 14.1 C4.7 17.4 7.3 19.6 10.6 19.6 C13.5 19.6 15.8 18.3 17.3 16.1',
	select: 'M5 3.5 L10.5 20 L13 13.5 L19.5 11 Z M13 13.5 L20 20.5',
	pen: 'M5 19 L7 14.5 L16.8 4.7 C17.7 3.8 19.1 3.8 20 4.7 C20.9 5.6 20.9 7 20 7.9 L10.2 17.7 Z M7 14.5 L10.2 17.7 M4 20 L13 20',
	rect: 'M4 5 C8 4.5 15.5 4.8 20 5.2 L19.7 19 C15 19.5 8.5 19.2 4.2 18.8 Z',
	roundedRect:
		'M7 5 L17 5 C19 5 20 6 20 8 L20 16 C20 18 19 19 17 19 L7 19 C5 19 4 18 4 16 L4 8 C4 6 5 5 7 5 Z',
	diamond: 'M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z',
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
	zoomToFit:
		'M9 4 L4 4 L4 9 M15 4 L20 4 L20 9 M4 15 L4 20 L9 20 M20 15 L20 20 L15 20 M8 8 L16 8 L16 16 L8 16 Z',
	upload: 'M12 15 L12 4 M8 8 L12 4 L16 8 M5 17 L5 20 L19 20 L19 17',
	download: 'M12 4 L12 15 M8 11 L12 15 L16 11 M5 17 L5 20 L19 20 L19 17',
	trash:
		'M5 7 L19 7 M9 7 L9 4.5 L15 4.5 L15 7 M7 7 L8 20 L16 20 L17 7 M10.5 10 L10.7 17 M13.5 10 L13.3 17',
};

const ICON_SEEDS: Record<SketchIconName, number> = {
	undo: 11,
	redo: 17,
	select: 23,
	pen: 29,
	rect: 31,
	roundedRect: 33,
	diamond: 35,
	circle: 37,
	line: 41,
	arrow: 43,
	text: 47,
	eraser: 53,
	zoomOut: 59,
	zoomIn: 61,
	zoomToFit: 63,
	upload: 73,
	download: 71,
	trash: 67,
};

function getExportFileName(date: Date): string {
	const parts = [
		date.getFullYear(),
		date.getMonth() + 1,
		date.getDate(),
		date.getHours(),
		date.getMinutes(),
		date.getSeconds(),
	].map((part) => String(part).padStart(2, '0'));

	return `shape-data-${parts.slice(0, 3).join('')}-${parts.slice(3).join('')}.json`;
}

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

interface ToolbarButtonProps {
	title: string;
	children: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
}

function ToolbarActionButton({ title, children, onClick, disabled = false }: ToolbarButtonProps) {
	return (
		<Tooltip.Root disabled={disabled}>
			<Tooltip.Trigger
				render={<BaseToolbar.Button disabled={disabled} focusableWhenDisabled={false} />}
				className='tb-button'
				aria-label={title}
				onClick={onClick}
			>
				{children}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Positioner className='ui-tooltip-positioner' sideOffset={8}>
					<Tooltip.Popup className='ui-tooltip'>{title}</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}

function ToolbarToolButton({ tool, title, children }: ToolbarButtonProps & { tool: ToolType }) {
	return (
		<Tooltip.Root>
			<Tooltip.Trigger
				render={<BaseToolbar.Button render={<Toggle value={tool} />} />}
				className='tb-button'
				aria-label={title}
			>
				{children}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Positioner className='ui-tooltip-positioner' sideOffset={8}>
					<Tooltip.Popup className='ui-tooltip'>{title}</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}

export function Toolbar() {
	const { t, i18n } = useTranslation();
	const toolService = useInject<IToolService>(IToolService);
	const actionLogManager = useInject<IActionLogManager>(IActionLogManager);
	const shapeManager = useInject<IShapeManager>(IShapeManager);
	const canvasInitService = useInject<ICanvasInitService>(ICanvasInitService);
	const viewportService = useInject<IViewportService>(IViewportService);
	const toastManager = Toast.useToastManager();
	const activeTool = toolService.store((s) => s.activeTool);
	const setActiveTool = toolService.store((s) => s.setActiveTool);
	const canUndo = actionLogManager.store((s) => s.canUndo);
	const canRedo = actionLogManager.store((s) => s.canRedo);
	const viewportScale = viewportService.store((s) => s.scale);
	const zoom = Math.round(viewportScale * 100);
	const canZoomOut = viewportScale > MIN_ZOOM_SCALE;
	const canZoomIn = viewportScale < MAX_ZOOM_SCALE;
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleToolClick = useCallback(
		(tool: ToolType) => {
			setActiveTool(tool);
		},
		[setActiveTool],
	);

	const handleZoomIn = useCallback(() => {
		viewportService.zoomIn();
	}, [viewportService]);

	const handleZoomOut = useCallback(() => {
		viewportService.zoomOut();
	}, [viewportService]);

	const handleZoomReset = useCallback(() => {
		viewportService.resetZoom();
	}, [viewportService]);

	const handleZoomToFit = useCallback(() => {
		const bounds = getShapesWorldBounds(shapeManager.getAllShapes());
		if (bounds) {
			viewportService.zoomToFit(bounds);
		}
	}, [shapeManager, viewportService]);

	const handleUndo = useCallback(() => {
		actionLogManager.undo();
	}, [actionLogManager]);

	const handleRedo = useCallback(() => {
		actionLogManager.redo();
	}, [actionLogManager]);

	const handleExport = useCallback(() => {
		const shapeData = shapeManager.getAllShapes().map((shape) => shape.toData());
		const blob = new Blob([JSON.stringify(shapeData, null, 2)], {
			type: 'application/json;charset=utf-8',
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		link.href = url;
		link.download = getExportFileName(new Date());
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 0);
	}, [shapeManager]);

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleImportFile = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const input = event.currentTarget;
			const file = input.files?.[0];
			input.value = '';

			if (!file) {
				return;
			}

			try {
				const shapeData = parseShapeDataJson(await file.text());
				canvasInitService.replace(shapeData);
			} catch (error) {
				console.error('Failed to import ShapeData JSON.', error);
				toastManager.add({
					description: t('toolbar.importError'),
					priority: 'high',
					type: 'error',
				});
			}
		},
		[canvasInitService, t, toastManager],
	);

	return (
		<BaseToolbar.Root id='toolbar' aria-label={t('toolbar.label')}>
			{/* Undo / Redo */}
			<BaseToolbar.Group className='tb-group'>
				<ToolbarActionButton title={t('toolbar.undo')} onClick={handleUndo} disabled={!canUndo}>
					<SketchIcon name='undo' />
				</ToolbarActionButton>
				<ToolbarActionButton title={t('toolbar.redo')} onClick={handleRedo} disabled={!canRedo}>
					<SketchIcon name='redo' />
				</ToolbarActionButton>
			</BaseToolbar.Group>

			<BaseToolbar.Separator className='tb-sep' />

			{/* Tools */}
			<ToggleGroup
				className='tb-group'
				aria-label={t('toolbar.label')}
				value={[activeTool]}
				onValueChange={(tools) => {
					if (tools[0]) {
						handleToolClick(tools[0] as ToolType);
					}
				}}
			>
				<ToolbarToolButton tool={ToolType.Select} title={t('toolbar.select')}>
					<SketchIcon name='select' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.Rect} title={t('toolbar.rect')}>
					<SketchIcon name='rect' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.RoundedRect} title={t('toolbar.roundedRect')}>
					<SketchIcon name='roundedRect' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.Diamond} title={t('toolbar.diamond')}>
					<SketchIcon name='diamond' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.Circle} title={t('toolbar.circle')}>
					<SketchIcon name='circle' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.Line} title={t('toolbar.line')}>
					<SketchIcon name='line' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.Arrow} title={t('toolbar.arrow')}>
					<SketchIcon name='arrow' />
				</ToolbarToolButton>
				<ToolbarToolButton tool={ToolType.Text} title={t('toolbar.text')}>
					<SketchIcon name='text' />
				</ToolbarToolButton>
			</ToggleGroup>

			<BaseToolbar.Separator className='tb-sep' />

			{/* Zoom */}
			<BaseToolbar.Group className='zoom-wrap'>
				<ToolbarActionButton
					title={t('toolbar.zoomOut')}
					onClick={handleZoomOut}
					disabled={!canZoomOut}
				>
					<SketchIcon name='zoomOut' />
				</ToolbarActionButton>
				<Menu.Root>
					<BaseToolbar.Button
						render={<Menu.Trigger />}
						className='zoom-label'
						aria-label={`${t('toolbar.zoomReset')}，${zoom}%`}
					>
						{zoom}%
					</BaseToolbar.Button>
					<Menu.Portal>
						<Menu.Positioner
							className='ui-menu-positioner zoom-menu__positioner'
							sideOffset={8}
							align='center'
						>
							<Menu.Popup className='zoom-menu__surface'>
								<Menu.Item className='zoom-menu__item' onClick={handleZoomReset}>
									<span className='zoom-menu__value' aria-hidden='true'>
										100%
									</span>
									<span>{t('toolbar.zoomReset')}</span>
								</Menu.Item>
								<Menu.Item className='zoom-menu__item' onClick={handleZoomToFit}>
									<SketchIcon name='zoomToFit' />
									<span>{t('toolbar.zoomToFit')}</span>
								</Menu.Item>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
				<ToolbarActionButton
					title={t('toolbar.zoomIn')}
					onClick={handleZoomIn}
					disabled={!canZoomIn}
				>
					<SketchIcon name='zoomIn' />
				</ToolbarActionButton>
			</BaseToolbar.Group>

			<BaseToolbar.Separator className='tb-sep' />

			<BaseToolbar.Group className='tb-group'>
				<ToolbarActionButton title={t('toolbar.importJson')} onClick={handleImportClick}>
					<SketchIcon name='upload' />
				</ToolbarActionButton>
				<ToolbarActionButton title={t('toolbar.exportJson')} onClick={handleExport}>
					<SketchIcon name='download' />
				</ToolbarActionButton>
				<input
					ref={fileInputRef}
					type='file'
					accept='.json,application/json'
					hidden
					onChange={handleImportFile}
				/>
			</BaseToolbar.Group>

			<BaseToolbar.Separator className='tb-sep' />

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
		</BaseToolbar.Root>
	);
}
