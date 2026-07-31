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
	public key = 'Delete';
	public fnKeys = ['Delete', 'Backspace'];

	public isMatch(e: KeyboardEvent): boolean {
		// 正在文本输入框内编辑时，退格/删除交给输入框，不删除图形
		if (this.isEditingText()) {
			return false;
		}
		return e.key === 'Delete' || e.key === 'Backspace';
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

	private isEditingText(): boolean {
		const el = document.activeElement as HTMLElement | null;
		if (!el) {
			return false;
		}
		return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
	}
}
