import { ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class MovingState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Moving;

	public override allowNextStateTypes = [ShapeStateEnum.Selected, ShapeStateEnum.MultiSelected];

	public onActivate() {
		console.log('ccdebug ');
	}

	public onDeactivate(): void {}
}
