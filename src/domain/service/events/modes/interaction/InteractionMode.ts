import {
	EventModeEnum,
	IEventMode,
	IHandler,
	IHandlerWithInteraction,
} from '../../../../contract/eventManager';
import { ToolType, IToolService } from '@/domain/contract/ToolService';
import { inject, multiInject, postConstruct } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IEventMode)
export class InteractionMode implements IEventMode {
	public mode = EventModeEnum.InteractionMode;

	@multiInject(IHandlerWithInteraction)
	public handlerList: IHandler[] = [];

	@postConstruct()
	public sortHandlers() {
		this.handlerList.sort((a, b) => a.sort - b.sort);
	}

	@inject(IToolService)
	private toolService!: IToolService;

	public enable(): boolean {
		const tool = this.toolService.store.getState().activeTool;
		return tool === ToolType.Select;
	}

	public onActivate(): void {}
	public onDeactivate(): void {}
}
