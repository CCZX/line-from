import { Container, Graphics } from 'pixi.js';
import {
	BasePropertyValue,
	FillPropertyValue,
	LinePropertyValue,
	ShapeContext,
	ShapeData,
	ShapeDecorateTypeEnum,
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
	StrokePropertyValue,
	TextPropertyValue,
} from './contract';
import { AbsDecorate } from './decorate/AbsDecorate';
import { HoverBorder } from './decorate/HoverBorder';
import { isPointInRect } from './geometry';
import { AbsState } from './state/AbsState';
import { StateFactory } from './state/StateFactory';
import { StateMachine } from './state/StateMachine';
import { AbsProperty } from './property/AbsProperty';
import { BaseProperty } from './property/BaseProperty';
import { FillProperty } from './property/FillProperty';
import { StrokeProperty } from './property/StrokeProperty';
import { LineProperty } from './property/LineProperty';
import { SelectedBorder } from './decorate/SelectedBorder';
import { ISelectService } from '@/domain/contract/SelectService';

export abstract class BaseShape<T extends Container = Container> {
	/**
	 * 图形、图形装饰的容器节点
	 */
	public container = new Container();

	/**
	 * 真正渲染的图形节点
	 */
	public graphics: T;

	/**
	 * 图形唯一标识
	 */
	public id: string;

	/**
	 * 图形类型
	 */
	public abstract get type(): ShapeTypeEnum;

	private stateMap: Map<ShapeStateEnum, AbsState> = new Map();
	protected decorateMap: Map<ShapeDecorateTypeEnum, AbsDecorate> = new Map();
	protected propertyMap: Map<ShapePropertyEnum, AbsProperty> = new Map();
	private stateMachine: StateMachine;

	protected context: ShapeContext;

	constructor(id: string, graphics: T, context: ShapeContext) {
		this.id = id;
		this.graphics = graphics;
		this.context = context;

		this.container.addChild(this.graphics);
		this.container.name = 'SHAPE_CONTAINER';
		this.stateMachine = new StateMachine(this);
		this.initDecorate();
		this.initProperty();
	}

	protected initProperty() {
		this.propertyMap.set(ShapePropertyEnum.Base, new BaseProperty(this));
		this.propertyMap.set(ShapePropertyEnum.Fill, new FillProperty(this));
		this.propertyMap.set(ShapePropertyEnum.Stroke, new StrokeProperty(this));
	}

	public setProperty<T extends Record<string, any>>(type: ShapePropertyEnum, value: T) {
		const property = this.propertyMap.get(type);
		if (property) {
			property.set(value);
			this.refreshDecorates();
		}
	}

	public updateProperty<T extends Record<string, any>>(type: ShapePropertyEnum, value: T) {
		const property = this.propertyMap.get(type);
		if (property) {
			property.update(value);
			this.refreshDecorates();
		}
	}

	/**
	 * 图形级统一重绘入口。
	 * 属性只维护自身数据和绘制细节，由 Shape 负责清理画布并编排完整绘制顺序。
	 */
	public redraw(): void {
		if (this.type === ShapeTypeEnum.Text) {
			this.layoutText();
			return;
		}

		if (this.type === ShapeTypeEnum.Line) {
			this.getProperty<LineProperty>(ShapePropertyEnum.Line)?.draw();
			return;
		}

		const base = this.propertyMap.get(ShapePropertyEnum.Base) as BaseProperty | undefined;
		if (!base) {
			return;
		}

		const { width, height } = base.get();
		const graphics = this.graphics as unknown as Graphics;
		graphics.clear();

		if (this.type === ShapeTypeEnum.Rectangle) {
			graphics.position.set(0, 0);
			// 保留完整矩形几何，手绘填充的空隙也能正常命中。
			graphics.beginFill(0, 0);
			graphics.drawRect(0, 0, width, height);
			graphics.endFill();
		}

		if (this.type === ShapeTypeEnum.Circle) {
			graphics.position.set(width / 2, height / 2);
		}

		this.getProperty<FillProperty>(ShapePropertyEnum.Fill)?.draw();
		this.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke)?.draw();
		this.layoutText();
	}

	private refreshDecorates() {
		this.decorateMap.forEach((decorate) => decorate.refresh());
	}

	public getProperty<T>(type: ShapePropertyEnum) {
		return this.propertyMap.get(type) as T;
	}

	/** 序列化为 ShapeData，用于删除后可撤销地重建图形 */
	public toData(): ShapeData {
		const properties: ShapeData['properties'] = {
			base: { ...(this.propertyMap.get(ShapePropertyEnum.Base)!.value as BasePropertyValue) },
		};

		const fill = this.propertyMap.get(ShapePropertyEnum.Fill)?.value as
			| FillPropertyValue
			| undefined;
		if (fill) {
			properties.fill = { ...fill };
		}

		const stroke = this.propertyMap.get(ShapePropertyEnum.Stroke)?.value as
			| StrokePropertyValue
			| undefined;
		if (stroke) {
			properties.stroke = { ...stroke };
		}

		const text = this.propertyMap.get(ShapePropertyEnum.Text)?.value as
			| TextPropertyValue
			| undefined;
		if (text) {
			properties.text = { ...text };
		}

		const line = this.propertyMap.get(ShapePropertyEnum.Line)?.value as
			| LinePropertyValue
			| undefined;
		if (line) {
			properties.line = { ...line, midPoints: line.midPoints?.map((p) => ({ ...p })) };
		}

		return { id: this.id, type: this.type, properties };
	}

	protected initDecorate() {
		this.decorateMap.set(ShapeDecorateTypeEnum.HoverBorder, new HoverBorder(this));
		this.decorateMap.set(ShapeDecorateTypeEnum.SelectedBorder, new SelectedBorder(this));
	}

	public getDecorate(type: ShapeDecorateTypeEnum) {
		return this.decorateMap.get(type);
	}

	public setState(stateType: ShapeStateEnum, onSuccess?: () => void, onError?: () => void) {
		if (stateType === this.getState()) {
			return;
		}

		const selectService = this.context.ioc.get<ISelectService>(ISelectService);

		if (stateType === ShapeStateEnum.Normal) {
			selectService.removeSelectedShapeById(this.id);
		}

		if (stateType === ShapeStateEnum.Selected) {
			selectService.setSelectedShape(this);
		}

		let state = this.stateMap.get(stateType);
		if (!state) {
			state = StateFactory.create(stateType, this);
			this.stateMap.set(stateType, state);
		}
		this.stateMachine.setState(state, onSuccess, onError);
	}

	public getState() {
		return this.stateMachine.getState();
	}

	public getPosition() {
		return {
			x: this.container.x,
			y: this.container.y,
		};
	}

	public getWH() {
		const p = this.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
		return {
			width: p.width,
			height: p.height,
		};
	}

	public getBounds() {
		const { width, height } = this.getWH();
		// container 的 pivot 设为中心后，local 坐标系下 shape 始终从 (0,0) 开始
		return { x: 0, y: 0, width, height };
	}

	/** 本地坐标命中检测，默认为包围盒判断，子类可按实际形状覆写 */
	public containsPoint(localPoint: Point): boolean {
		return isPointInRect(localPoint, this.getBounds());
	}

	/** 供支持文字的图形在尺寸变化后重新布局，默认图形无需处理 */
	public layoutText(): void {}

	// 以下三个方法供 EditState 回调，TextEditableShape override
	public showTextInput(): void {}
	public hideTextInput(): void {}
	public commitTextInput(): void {}
}
