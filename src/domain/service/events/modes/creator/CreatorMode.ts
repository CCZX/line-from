import {
	EventModeEnum,
	IEventMode,
	IHandler,
	IHandlerWithCreator,
} from '../../../../contract/eventManager';
import { IToolService } from '@/domain/contract/ToolService';
import { inject, multiInject, postConstruct } from 'inversify';
import { provide } from 'inversify-binding-decorators';

@provide(IEventMode)
export class CreatorMode implements IEventMode {
	public mode = EventModeEnum.CreatorMode;

	@multiInject(IHandlerWithCreator)
	public handlerList: IHandler[] = [];

	@postConstruct()
	public sortHandlers() {
		this.handlerList.sort((a, b) => a.sort - b.sort);
	}

	@inject(IToolService)
	private toolService!: IToolService;

	public enable(): boolean {
		const tool = this.toolService.store.getState().activeTool;
		return tool !== null && tool !== 'select' && tool !== 'pen' && tool !== 'eraser';
	}

	public onActivate(): void {}
	public onDeactivate(): void {}
}
