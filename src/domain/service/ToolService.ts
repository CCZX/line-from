import { create } from 'zustand';
import { IToolService, ToolType, ToolState } from '@/domain/contract/ToolService';
import { provide } from 'inversify-binding-decorators';

const toolStore = create<ToolState>((set) => ({
	activeTool: ToolType.Select,
	setActiveTool(tool) {
		set({ activeTool: tool });
	},
}));

@provide(IToolService)
export class ToolService implements IToolService {
	public store = toolStore;
}
