import { ShapeData } from '@/shape/contract';
import {
	IActionLogManager,
	ICanvasInitService,
	IEventManager,
	ISelectService,
	IShapeManager,
} from '../contract';
import { provide } from 'inversify-binding-decorators';
import { inject } from 'inversify';
import { IocContainerService, ILoggerService } from '@/common/contract';
import { createShapeFromData } from '@/shape/ShapeFactory';

@provide(ICanvasInitService)
export class CanvasInitService implements ICanvasInitService {
	@inject(ILoggerService)
	private loggerService!: ILoggerService;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IEventManager)
	private eventManager!: IEventManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IocContainerService)
	private iocContainerService!: IocContainerService;

	public init(data: ShapeData[]) {
		for (const shapeData of data) {
			const shape = createShapeFromData(shapeData, { ioc: this.iocContainerService });
			if (shape) {
				this.shapeManager.setShape(shape);
			}
		}
	}

	public replace(data: ShapeData[]): void {
		this.selectService.clearSelectedShapes();
		this.selectService.hideMultiSelectOverlay();
		this.eventManager.clearInteractionState();
		this.actionLogManager.clear();
		this.shapeManager.clearShapes();
		this.init(data);
	}
}
