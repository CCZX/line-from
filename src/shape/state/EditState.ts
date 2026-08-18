import { ShapeStateEnum } from '../contract';
import { AbsState } from './AbsState';

export class EditState extends AbsState {
	public type: ShapeStateEnum = ShapeStateEnum.Edit;

	public override allowNextStateTypes = [ShapeStateEnum.Normal, ShapeStateEnum.Selected];

	public onActivate() {
		this.shape.showTextInput();
	}

	public onDeactivate(): void {
		this.shape.commitTextInput();
		this.shape.hideTextInput();
	}
}
