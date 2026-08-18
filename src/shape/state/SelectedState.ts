import { ShapeDecorateTypeEnum, ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class SelectedState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Selected;

	public override allowNextStateTypes: ShapeStateEnum[] = [
		ShapeStateEnum.Normal,
		ShapeStateEnum.Moving,
		ShapeStateEnum.Resizing,
		ShapeStateEnum.Rotating,
		ShapeStateEnum.MultiSelected,
		ShapeStateEnum.Edit,
	];

	public onActivate() {
		const selectedBorder = this.shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder);
		if (!selectedBorder) {
			return;
		}
		selectedBorder.onActivate();
	}

	public onDeactivate(): void {
		const selectedBorder = this.shape.getDecorate(ShapeDecorateTypeEnum.SelectedBorder);
		if (!selectedBorder) {
			return;
		}
		selectedBorder.onDeactivate();
	}
}
