import { IocContainerService } from '@lineform/common/contract';
import {
	IActionManager,
	ISelectService,
	IShapeManager,
	IShortcutKey,
	control,
	meta,
} from '@lineform/domain/contract';
import { CreateShapeAction } from '@lineform/domain/service/Action/Actions/CreateShapeAction';
import {
	type LineEndpointValue,
	type LinePropertyValue,
	type ShapeData,
	ShapeStateEnum,
} from '@lineform/shape/contract';
import { inject } from 'inversify';
import { provide } from 'inversify-binding-decorators';

const DUPLICATE_OFFSET = 10;

let duplicateIdCounter = 0;

@provide(IShortcutKey)
export class DuplicateShortcutKey implements IShortcutKey {
	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	public name = '复制';
	public key = 'd';
	public fnKeys = [meta, control];

	public isMatch(_event: KeyboardEvent): boolean {
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
		// 避免浏览器将 Cmd/Ctrl + D 处理为“添加书签”。
		event.preventDefault();

		const selectedShapes = this.selectService.getSelectedShapes();
		if (selectedShapes.length === 0) {
			return;
		}

		const sourceData = selectedShapes.map((shape) => shape.toData());
		const copiedIdBySourceId = new Map(
			sourceData.map(({ id }) => [id, this.createDuplicateId()] as const),
		);
		const copiedData = sourceData.map((data) => this.copyShapeData(data, copiedIdBySourceId));

		this.actionManager.push(new CreateShapeAction(copiedData, this.ioc));

		const copiedShapes = copiedData
			.map(({ id }) => this.shapeManager.getShapeById(id))
			.filter((shape) => shape !== undefined);
		if (copiedShapes.length === 0) {
			return;
		}

		selectedShapes.forEach((shape) => shape.setState(ShapeStateEnum.Normal));
		this.selectService.clearSelectedShapes();

		const nextState =
			copiedShapes.length === 1 ? ShapeStateEnum.Selected : ShapeStateEnum.MultiSelected;
		copiedShapes.forEach((shape) => shape.setState(nextState));
		this.selectService.setMultipleSelectedShapes(copiedShapes);
		this.selectService.updateMultiSelectOverlay(copiedShapes);
	}

	public onKeyUp(_event: KeyboardEvent): void {}

	private createDuplicateId(): string {
		let id: string;
		do {
			id = `shape-copy-${++duplicateIdCounter}-${Date.now()}`;
		} while (this.shapeManager.getShapeById(id));
		return id;
	}

	private copyShapeData(data: ShapeData, copiedIdBySourceId: Map<string, string>): ShapeData {
		const { base, fill, stroke, text, line } = data.properties;
		const properties: ShapeData['properties'] = {
			base: {
				...base,
				x: base.x + DUPLICATE_OFFSET,
				y: base.y + DUPLICATE_OFFSET,
			},
		};

		if (fill) {
			properties.fill = { ...fill };
		}
		if (stroke) {
			properties.stroke = { ...stroke };
		}
		if (text) {
			properties.text = { ...text };
		}
		if (line) {
			properties.line = this.copyLine(line, copiedIdBySourceId);
		}

		return {
			id: copiedIdBySourceId.get(data.id)!,
			type: data.type,
			properties,
		};
	}

	private copyLine(
		line: LinePropertyValue,
		copiedIdBySourceId: Map<string, string>,
	): LinePropertyValue {
		return {
			...line,
			start: this.copyEndpoint(line.start, copiedIdBySourceId),
			end: this.copyEndpoint(line.end, copiedIdBySourceId),
			midPoints: line.midPoints?.map(({ x, y }) => ({
				x: x + DUPLICATE_OFFSET,
				y: y + DUPLICATE_OFFSET,
			})),
		};
	}

	private copyEndpoint(
		endpoint: LineEndpointValue,
		copiedIdBySourceId: Map<string, string>,
	): LineEndpointValue {
		const copiedEndpoint: LineEndpointValue = {
			...endpoint,
			x: endpoint.x + DUPLICATE_OFFSET,
			y: endpoint.y + DUPLICATE_OFFSET,
		};

		if (!endpoint.shapeId) {
			return copiedEndpoint;
		}

		const copiedShapeId = copiedIdBySourceId.get(endpoint.shapeId);
		if (copiedShapeId) {
			copiedEndpoint.shapeId = copiedShapeId;
		} else {
			// 选区外的锚点不能继续绑定原图形，否则副本在视觉上不会产生偏移。
			delete copiedEndpoint.shapeId;
			delete copiedEndpoint.anchor;
		}

		return copiedEndpoint;
	}
}
