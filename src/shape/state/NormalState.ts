import { ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class NormalState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Normal;

	public override allowNextStateTypes = [
		ShapeStateEnum.Hover,
		ShapeStateEnum.Selected,
		ShapeStateEnum.MultiSelected,
	];

	public onActivate() {}

	public onDeactivate(): void {}
}
