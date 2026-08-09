import { control, ISelectService, IShapeManager, IShortcutKey, meta } from '@/domain/contract';
import { ShapeStateEnum } from '@/shape/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IShortcutKey)
export class SelectAllShortcutKey implements IShortcutKey {
	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	public name = '全选';
	public key = 'a';
	public fnKeys = [meta, control];

	public isMatch(_e: KeyboardEvent): boolean {
		const element = document.activeElement as HTMLElement | null;
		if (!element) {
			return true;
		}
		return !(
			element.tagName === 'INPUT' ||
			element.tagName === 'TEXTAREA' ||
			element.isContentEditable
		);
	}

	public onKeyDown(event: KeyboardEvent): void {
		event.preventDefault();

		const shapes = this.shapeManager.getAllShapes();
		const state = shapes.length === 1 ? ShapeStateEnum.Selected : ShapeStateEnum.MultiSelected;
		shapes.forEach((shape) => shape.setState(state));

		this.selectService.setMultipleSelectedShapes(shapes);
		this.selectService.updateMultiSelectOverlay(shapes);
	}

	public onKeyUp(_event: KeyboardEvent): void {}
}
