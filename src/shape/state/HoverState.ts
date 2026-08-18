import { ShapeDecorateTypeEnum, ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class HoverState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Hover;

	public override allowNextStateTypes = [
		ShapeStateEnum.Normal,
		ShapeStateEnum.Selected,
		ShapeStateEnum.MultiSelected,
	];

	public onActivate() {
		const hoverBorder = this.shape.getDecorate(ShapeDecorateTypeEnum.HoverBorder);
		if (!hoverBorder) {
			return;
		}
		hoverBorder.onActivate();
	}

	public onDeactivate() {
		const hoverBorder = this.shape.getDecorate(ShapeDecorateTypeEnum.HoverBorder);
		if (!hoverBorder) {
			return;
		}
		hoverBorder.onDeactivate();
	}
}
