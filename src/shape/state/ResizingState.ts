import { ShapeDecorateTypeEnum, ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class ResizingState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Resizing;

	public override allowNextStateTypes = [ShapeStateEnum.Selected, ShapeStateEnum.MultiSelected];

	public onActivate() {
		this.shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder)?.onActivate();
	}

	public onDeactivate(): void {
		this.shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder)?.onDeactivate();
	}
}
