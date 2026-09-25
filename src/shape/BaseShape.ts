import { Container } from '@pixi/display';
import {
	BasePropertyValue,
	FillPropertyValue,
	LinePropertyValue,
	ShapeContext,
	ShapeData,
	ShapeDecorateTypeEnum,
	ShapePropertyEnum,
	ShapeResizeRequest,
	ShapeStateEnum,
	ShapeTypeEnum,
	StrokePropertyValue,
	TextPropertyValue,
} from './contract';
import { AbsDecorate, createDecorateViewport, type DecorateViewport } from './decorate/AbsDecorate';
import { HoverBorder } from './decorate/HoverBorder';
import { isPointInRect } from './geometry';
import { AbsState } from './state/AbsState';
import { StateFactory } from './state/StateFactory';
import { StateMachine } from './state/StateMachine';
import { AbsProperty } from './property/AbsProperty';
import { BaseProperty } from './property/BaseProperty';
import { FillProperty } from './property/FillProperty';
import { StrokeProperty } from './property/StrokeProperty';
import { SelectedBorder } from './decorate/SelectedBorder';
import { ISelectService } from '@lineform/domain/contract/SelectService';
import { IViewportService } from '@lineform/domain/contract/ViewportService';

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
		this.stateMachine = new StateMachine(this);
		const viewportService = this.context.ioc.get<IViewportService>(IViewportService);
		this.initDecorate(createDecorateViewport(viewportService));
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

	/** 图形级统一重绘入口，具体绘制行为由子类实现。 */
	public redraw(): void {
		this.drawShape();
		this.layoutText();
	}

	/** 子类绘制自身内容；基类不感知具体图形类型。 */
	protected drawShape(): void {}

	private refreshDecorates() {
		this.decorateMap.forEach((decorate) => decorate.refresh());
	}

	public getProperty<T>(type: ShapePropertyEnum) {
		return this.propertyMap.get(type) as T;
	}

	public hasProperty(type: ShapePropertyEnum): boolean {
		return this.propertyMap.has(type);
	}

	/** 是否支持通过包围盒手柄调整尺寸。 */
	public get supportsBoxResize(): boolean {
		return true;
	}

	/** 是否支持旋转。 */
	public get supportsRotation(): boolean {
		return true;
	}

	/** 是否参与对齐吸附。 */
	public get supportsAlignmentSnap(): boolean {
		return true;
	}

	/** 是否可作为连线目标。 */
	public get acceptsConnections(): boolean {
		return true;
	}

	/** 选中框相对图形包围盒的内缩量。 */
	public getSelectionBorderInset(_viewportScale: number): number {
		return 0;
	}

	/** 应用图形自身的缩放约束，默认接受交互层计算出的矩形。 */
	public resolveResize(request: ShapeResizeRequest): BasePropertyValue {
		return request.proposed;
	}

	/** 图形在世界坐标系中的轴对齐包围盒。 */
	public getWorldBounds(): Rectangle {
		const { width, height } = this.getBounds();
		const centerX = this.container.x;
		const centerY = this.container.y;
		const radians = (this.container.angle * Math.PI) / 180;
		const absCos = Math.abs(Math.cos(radians));
		const absSin = Math.abs(Math.sin(radians));
		const worldWidth = width * absCos + height * absSin;
		const worldHeight = width * absSin + height * absCos;

		return {
			x: centerX - worldWidth / 2,
			y: centerY - worldHeight / 2,
			width: worldWidth,
			height: worldHeight,
		};
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

	protected initDecorate(viewport: DecorateViewport) {
		this.decorateMap.set(ShapeDecorateTypeEnum.HoverBorder, new HoverBorder(this, viewport));
		this.decorateMap.set(ShapeDecorateTypeEnum.SelectedBorder, new SelectedBorder(this, viewport));
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

	/** 本地坐标点到图形轮廓的最短距离；图形内部返回 0。 */
	public distanceToPoint(localPoint: Point): number {
		if (this.containsPoint(localPoint)) {
			return 0;
		}

		const bounds = this.getBounds();
		const dx = Math.max(bounds.x - localPoint.x, 0, localPoint.x - (bounds.x + bounds.width));
		const dy = Math.max(bounds.y - localPoint.y, 0, localPoint.y - (bounds.y + bounds.height));
		return Math.hypot(dx, dy);
	}

	/** 供支持文字的图形在尺寸变化后重新布局，默认图形无需处理 */
	public layoutText(): void {}

	// 以下三个方法供 EditState 回调，TextEditableShape override
	public showTextInput(): void {}
	public hideTextInput(): void {}
	public commitTextInput(): void {}
}
