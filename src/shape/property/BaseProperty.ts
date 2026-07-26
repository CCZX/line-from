import { Graphics } from 'pixi.js';
import { AbsProperty } from './AbsProperty';
import { BasePropertyValue, ShapePropertyEnum, ShapeTypeEnum } from '../contract';
import { BaseShape } from '../BaseShape';
import { FillProperty } from './FillProperty';
import { StrokeProperty } from './StrokeProperty';

const DEFAULT_VALUE: BasePropertyValue = { x: 0, y: 0, width: 100, height: 100 };

export class BaseProperty extends AbsProperty<BasePropertyValue> {
	private lastDrawValue: BasePropertyValue | null = null;

	constructor(shape: BaseShape, value?: BasePropertyValue) {
		super(shape, value || DEFAULT_VALUE);
	}

	public draw(force = false): void {
		const { x, y, width, height, rotation = 0 } = this.value;

		// pivot 设为图形中心，position 也设为中心，rotation 绕中心旋转
		this.shape.container.x = x + width / 2;
		this.shape.container.y = y + height / 2;
		this.shape.container.pivot.set(width / 2, height / 2);
		this.shape.container.angle = rotation;

		if (this.shape.type === ShapeTypeEnum.Text) {
			this.shape.layoutText();
			return;
		}

		if (this.shape.type === ShapeTypeEnum.Line) {
			// 线的渲染与容器定位完全由 LineProperty 负责（初始化期间 Line 属性尚未创建）
			this.shape.getProperty<AbsProperty>(ShapePropertyEnum.Line)?.draw();
			return;
		}

		const last = this.lastDrawValue;
		if (
			!force &&
			last &&
			last.width === width &&
			last.height === height &&
			(last.rotation ?? 0) === rotation
		) {
			this.lastDrawValue = { ...this.value };
			return;
		}

		this.lastDrawValue = { ...this.value };

		const g = this.shape.graphics as Graphics;
		g.clear();

		if (this.shape.type === ShapeTypeEnum.Rectangle) {
			g.position.set(0, 0);
			g.beginFill(0, 0);
			g.drawRect(0, 0, width, height);
			g.endFill();
		}

		if (this.shape.type === ShapeTypeEnum.Circle) {
			g.position.set(width / 2, height / 2);
		}

		const fill = this.shape.getProperty<FillProperty>(ShapePropertyEnum.Fill);
		fill?.draw();

		const stroke = this.shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke);
		stroke?.draw();

		this.shape.layoutText();
	}
}
