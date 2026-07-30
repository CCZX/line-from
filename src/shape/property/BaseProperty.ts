import { AbsProperty } from './AbsProperty';
import { BasePropertyValue } from '../contract';
import { BaseShape } from '../BaseShape';

const DEFAULT_VALUE: BasePropertyValue = { x: 0, y: 0, width: 100, height: 100 };

export class BaseProperty extends AbsProperty<BasePropertyValue> {
	private lastDrawValue: BasePropertyValue | null = null;

	constructor(shape: BaseShape, value?: BasePropertyValue) {
		super(shape, value || DEFAULT_VALUE);
	}

	public draw(): void {
		const { x, y, width, height, rotation = 0 } = this.value;

		// pivot 设为图形中心，position 也设为中心，rotation 绕中心旋转
		this.shape.container.x = x + width / 2;
		this.shape.container.y = y + height / 2;
		this.shape.container.pivot.set(width / 2, height / 2);
		this.shape.container.angle = rotation;

		const last = this.lastDrawValue;
		const sizeChanged = !last || last.width !== width || last.height !== height;
		this.lastDrawValue = { ...this.value };

		if (sizeChanged) {
			this.shape.redraw();
		} else {
			// 位置或旋转变化不需要重建 Graphics，但文字布局可能依赖当前尺寸。
			this.shape.layoutText();
		}
	}
}
