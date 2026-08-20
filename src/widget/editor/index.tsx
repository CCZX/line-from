import { useEffect, useRef } from 'react';
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
	const containerRef = useRef<HTMLDivElement>(null);
	const eventManager = useInject<IEventManager>(IEventManager);
	const canvasInitService = useInject<ICanvasInitService>(ICanvasInitService);
	const shortcutKeyManager = useInject<IShortcutKeyManager>(IShortcutKeyManager);
	const viewportService = useInject<IViewportService>(IViewportService);
	const shapeManager = useInject<IShapeManager>(IShapeManager);
	const destroyableList = useMultiInject<IDestroyable>(IDestroyable);

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const stage = Stage.createStage(containerRef.current);

		viewportService.setStage(stage);

		canvasInitService.init(MOCK_SHAPE_DATA);
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

	return <div ref={containerRef} className='editor-canvas-container' />;
}

export default Editor;
