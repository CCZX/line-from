import { ShapeData, ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { BaseShape } from '@/shape/BaseShape';
import { Circle } from '@/shape/Circle';
import { Rectangle } from '@/shape/Rectangle';
import { Line } from '@/shape/Line';
import { Text } from '@/shape/Text';
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
		for (let i = 0; i < data.length; i++) {
			const shapeDataItem = data[i];
			const { base, fill, stroke, text, line } = shapeDataItem.properties;

			let shape: BaseShape | null = null;

			if (shapeDataItem.type === ShapeTypeEnum.Circle) {
				shape = new Circle(shapeDataItem.id, { ioc: this.iocContainerService });
			} else if (shapeDataItem.type === ShapeTypeEnum.Rectangle) {
				shape = new Rectangle(shapeDataItem.id, { ioc: this.iocContainerService });
			} else if (shapeDataItem.type === ShapeTypeEnum.Text) {
				shape = new Text(shapeDataItem.id, { ioc: this.iocContainerService });
			} else if (shapeDataItem.type === ShapeTypeEnum.Line) {
				shape = new Line(shapeDataItem.id, { ioc: this.iocContainerService });
			}

			if (shape) {
				shape.setProperty(ShapePropertyEnum.Base, { ...base });
				if (fill) {
					shape.setProperty(ShapePropertyEnum.Fill, fill);
				}
				if (stroke) {
					shape.setProperty(ShapePropertyEnum.Stroke, stroke);
				}
				if (text) {
					shape.setProperty(ShapePropertyEnum.Text, text);
				}
				if (line) {
					shape.setProperty(ShapePropertyEnum.Line, line);
				}
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
