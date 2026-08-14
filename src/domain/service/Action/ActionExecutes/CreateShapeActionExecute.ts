import { BaseShape } from '@/shape/BaseShape';
import { AbsActionExecute } from '../AbsActionExecute';
import { CreateShapeAction } from '../Actions/CreateShapeAction';
import { ShapePropertyEnum, ShapeTypeEnum } from '@/shape/contract';
import { Circle } from '@/shape/Circle';
import { Rectangle } from '@/shape/Rectangle';
import { RoundedRectangle } from '@/shape/RoundedRectangle';
import { Diamond } from '@/shape/Diamond';
import { Line } from '@/shape/Line';
import { Text } from '@/shape/Text';
import { ActionTypeEnum, IActionExecute } from '../../../contract/Action';
import { IShapeManager } from '@/domain/contract';
import { inject } from 'inversify';
import { IocContainerService } from '@/common/contract';
import { provide } from 'inversify-binding-decorators';

@provide(IActionExecute)
export class CreateShapeActionExecute extends AbsActionExecute {
	public type: ActionTypeEnum = ActionTypeEnum.CreateShape;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IocContainerService)
	private iocContainerService!: IocContainerService;

	public execute(action: CreateShapeAction): void {
		for (const { id, type, properties } of action.data) {
			const { base, fill, stroke, text, line } = properties;

			let shape: BaseShape;
			if (type === ShapeTypeEnum.Rectangle) {
				shape = new Rectangle(id, { ioc: this.iocContainerService });
			} else if (type === ShapeTypeEnum.RoundedRectangle) {
				shape = new RoundedRectangle(id, { ioc: this.iocContainerService });
			} else if (type === ShapeTypeEnum.Diamond) {
				shape = new Diamond(id, { ioc: this.iocContainerService });
			} else if (type === ShapeTypeEnum.Circle) {
				shape = new Circle(id, { ioc: this.iocContainerService });
			} else if (type === ShapeTypeEnum.Text) {
				shape = new Text(id, { ioc: this.iocContainerService });
			} else if (type === ShapeTypeEnum.Line) {
				shape = new Line(id, { ioc: this.iocContainerService });
			} else {
				shape = new Rectangle(id, { ioc: this.iocContainerService });
			}

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
