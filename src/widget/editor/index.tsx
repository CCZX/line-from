import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './index.less';
import { MOCK_SHAPE_DATA } from './shapeData';
import { Stage } from '@/canvas/core/Stage';
import { useInject, useMultiInject } from '@/common/context';
import {
	ICanvasInitService,
	IEventManager,
	IShapeManager,
	IShortcutKeyManager,
} from '@/domain/contract';
import { IViewportService } from '@/domain/contract/ViewportService';
import { IDestroyable } from '@/common/contract/Destroyable';
import { getShapesWorldBounds } from '@/domain/service/ShapeManager';

function Editor() {
	const { t } = useTranslation();
	const containerRef = useRef<HTMLDivElement>(null);
	const eventManager = useInject<IEventManager>(IEventManager);
	const canvasInitService = useInject<ICanvasInitService>(ICanvasInitService);
	const shortcutKeyManager = useInject<IShortcutKeyManager>(IShortcutKeyManager);
	const viewportService = useInject<IViewportService>(IViewportService);
	const shapeManager = useInject<IShapeManager>(IShapeManager);
	const destroyableList = useMultiInject<IDestroyable>(IDestroyable);
	const isEmpty = shapeManager.store((state) => state.shapeCount === 0);

	const handleCreateExample = useCallback(() => {
		canvasInitService.replace(MOCK_SHAPE_DATA);
		const bounds = getShapesWorldBounds(shapeManager.getAllShapes());
		if (bounds) {
			viewportService.zoomToFit(bounds);
		}
	}, [canvasInitService, shapeManager, viewportService]);

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const stage = Stage.createStage(containerRef.current);

		viewportService.setStage(stage);

		canvasInitService.init([]);
		const initialBounds = getShapesWorldBounds(shapeManager.getAllShapes());
		if (initialBounds) {
			viewportService.zoomToFit(initialBounds);
		}
		eventManager.start(containerRef.current);
		shortcutKeyManager.start();

		return () => {
			stage.destroy();

			destroyableList.forEach((destroyable) => destroyable.destroy());
		};
	}, []);

	return (
		<main className='editor'>
			<div ref={containerRef} className='editor-canvas-container' />
			{isEmpty && (
				<section className='editor-empty-state' aria-labelledby='editor-empty-state-title'>
					<div className='editor-empty-state__illustration' aria-hidden='true'>
						<svg viewBox='0 0 184 96'>
							<path className='editor-empty-state__scribble' d='M4 82 C42 91 143 88 179 76' />
							<path className='editor-empty-state__connector' d='M54 47 C70 27 86 67 105 45' />
							<path className='editor-empty-state__connector-arrow' d='M99 41 L106 45 L101 51' />
							<circle className='editor-empty-state__circle' cx='31' cy='47' r='20' />
							<rect
								className='editor-empty-state__rectangle'
								x='107'
								y='27'
								width='50'
								height='40'
								rx='9'
							/>
							<path className='editor-empty-state__plus' d='M132 40 L132 54 M125 47 L139 47' />
						</svg>
					</div>
					<h1 id='editor-empty-state-title' className='editor-empty-state__title'>
						{t('editor.emptyTitle')}
					</h1>
					<p className='editor-empty-state__description'>{t('editor.emptyDescription')}</p>
					<button
						type='button'
						className='editor-empty-state__button'
						onClick={handleCreateExample}
					>
						{t('editor.createExample')}
						<span className='editor-empty-state__button-arrow' aria-hidden='true'>
							→
						</span>
					</button>
				</section>
			)}
		</main>
	);
}

export default Editor;
