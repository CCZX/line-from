import { ShapeDecorateTypeEnum, ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class RotatingState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Rotating;

	public override allowNextStateTypes = [ShapeStateEnum.Selected, ShapeStateEnum.MultiSelected];

	public onActivate() {
		this.shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder)?.onActivate();
	}

	public onDeactivate(): void {
		this.shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder)?.onDeactivate();
	}
}
