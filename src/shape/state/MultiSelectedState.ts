import { ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class MultiSelectedState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.MultiSelected;

	public override allowNextStateTypes: ShapeStateEnum[] = [
		ShapeStateEnum.Normal,
		ShapeStateEnum.Moving,
		ShapeStateEnum.Resizing,
		ShapeStateEnum.Rotating,
	];

	public onActivate() {}

	public onDeactivate(): void {}
}
