import { BaseShape } from '../BaseShape';

export abstract class AbsProperty<T extends Record<string, any> = {}> {
	public shape: BaseShape;

	public value: T;

	constructor(shape: BaseShape, value: T) {
		this.shape = shape;
		this.value = value;
	}

	public abstract draw(): void;

	public set(value: T) {
		this.value = value;
		this.draw();
	}

	public update(value: Partial<T>) {
		this.value = { ...this.value, ...value };
		this.draw();
	}

	public get() {
		return this.value;
	}
}
