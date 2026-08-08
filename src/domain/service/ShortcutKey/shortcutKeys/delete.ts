import { IActionManager, IEventManager, ISelectService, IShortcutKey } from '@/domain/contract';
import { RemoveShapeAction } from '@/domain/service/Action/Actions/RemoveShapeAction';
import { IocContainerService } from '@/common/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IShortcutKey)
export class DeleteShortcutKey implements IShortcutKey {
	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IEventManager)
	private eventManager!: IEventManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	public name = '删除';
	public key = ['Delete', 'Backspace'];
	public fnKeys = [];

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

	public onKeyDown(e: KeyboardEvent): void {
		const shapes = Array.from(this.selectService.getSelectedShapes().values());
		if (shapes.length === 0) {
			return;
		}

		// 阻止 Backspace 触发浏览器后退
		e.preventDefault();

		const data = shapes.map((shape) => shape.toData());
		this.actionManager.push(new RemoveShapeAction(data, this.ioc));

		// 同步清空跨 handler 共享的选中状态，避免残留已删除图形的引用
		this.eventManager.clearSelection();
	}

	public onKeyUp(_e: KeyboardEvent): void {}
}
