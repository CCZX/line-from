import {
	BasePropertyValue,
	LineEndpointValue,
	ShapeData,
	ShapePropertyEnum,
	ShapeStateEnum,
	ShapeTypeEnum,
} from '@/shape/contract';
import { ToolType, IToolService } from '@/domain/contract/ToolService';
import {
	HandlerEnum,
	InteractionState,
	EventPayload,
	IHandler,
	IHandlerWithCreator,
} from '../../../../../contract/EventManager';
import { CreateShapeAction } from '@/domain/service/Action/Actions/CreateShapeAction';
import { UpdatePropsAction } from '@/domain/service/Action/Actions/UpdatePropsAction';
import { IActionLogManager, IActionManager } from '@/domain/contract/Action';
import { IShapeManager } from '@/domain/contract';
import { ISelectService } from '@/domain/contract/SelectService';
import { IViewportService } from '@/domain/contract/ViewportService';
import { getShapeAnchorPoint } from '@/shape/geometry';
import { BaseProperty } from '@/shape/property/BaseProperty';
import { LineProperty } from '@/shape/property/LineProperty';
import { inject } from 'inversify';
import { IocContainerService } from '@/common/contract';
import { provide } from 'inversify-binding-decorators';
import { SHAPE_COLORS } from '@/common/color';

let _idCounter = 0;
function nextId(): string {
	return `shape-${++_idCounter}-${Date.now()}`;
}

const DEFAULT_PROPS = {
	stroke: { color: SHAPE_COLORS.border.default, width: 1, alpha: 1, style: 'sketchy' as const },
	fill: { color: SHAPE_COLORS.background.default, alpha: 1, style: 'sketchy' as const },
	text: {
		text: '',
		color: SHAPE_COLORS.text.default,
		fontSize: 16,
		horizontalAlign: 'center' as const,
		verticalAlign: 'middle' as const,
		padding: 8,
	},
};

const DEFAULT_SIZE = { width: 100, height: 100 };

const DEFAULT_SIZE_BY_SHAPE_TYPE: Partial<
	Record<ShapeTypeEnum, { width: number; height: number }>
> = {
	[ShapeTypeEnum.Rectangle]: { width: 120, height: 120 },
	[ShapeTypeEnum.RoundedRectangle]: { width: 120, height: 80 },
	[ShapeTypeEnum.Diamond]: { width: 120, height: 120 },
	[ShapeTypeEnum.Circle]: { width: 80, height: 80 },
};

/** 拖拽位移小于该阈值视为单击，回退为默认尺寸 */
const DRAG_THRESHOLD = 3;

const SHAPE_TYPE_BY_DRAG_TOOL: Partial<Record<ToolType, ShapeTypeEnum>> = {
	[ToolType.Rect]: ShapeTypeEnum.Rectangle,
	[ToolType.RoundedRect]: ShapeTypeEnum.RoundedRectangle,
	[ToolType.Diamond]: ShapeTypeEnum.Diamond,
	[ToolType.Circle]: ShapeTypeEnum.Circle,
	[ToolType.Line]: ShapeTypeEnum.Line,
	[ToolType.Arrow]: ShapeTypeEnum.Line,
};

@provide(IHandlerWithCreator)
export class CreateHandler implements IHandler {
	public type: HandlerEnum = HandlerEnum.Select;
	public sort: number = 10;

	@inject(IocContainerService)
	private ioc!: IocContainerService;

	@inject(IActionManager)
	private actionManager!: IActionManager;

	@inject(IActionLogManager)
	private actionLogManager!: IActionLogManager;

	@inject(IShapeManager)
	private shapeManager!: IShapeManager;

	@inject(ISelectService)
	private selectService!: ISelectService;

	@inject(IViewportService)
	private viewportService!: IViewportService;

	@inject(IToolService)
	private toolService!: IToolService;

	private isCreating = false;
	private startPoint: { x: number; y: number } | null = null;
	private creatingId: string | null = null;
	private creatingType: ShapeTypeEnum | null = null;

	public enable(_state: InteractionState): boolean {
		const tool = this.toolService.store.getState().activeTool;
		return tool === ToolType.Text || SHAPE_TYPE_BY_DRAG_TOOL[tool] !== undefined;
	}

	public execute(e: PointerEvent, _state: InteractionState, payload: EventPayload): boolean {
		switch (e.type) {
			case 'pointerdown':
				return this.handlePointerDown(payload);
			case 'pointermove':
				// 拖拽过程中丢失了 pointerup（如鼠标移出窗口松开），主动收尾
				if (e.buttons !== 1 && this.isCreating) {
					this.finish(payload);
					return false;
				}
				return this.handlePointerMove(payload);
			case 'pointerup':
				return this.handlePointerUp(payload);
			default:
				return true;
		}
	}

	private handlePointerDown(payload: EventPayload): boolean {
		const tool = this.toolService.store.getState().activeTool;
		const localPoint = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);

		// 图形与连线工具进入拖拽创建流程
		const type = SHAPE_TYPE_BY_DRAG_TOOL[tool];
		if (type !== undefined) {
			this.actionLogManager.setStreamStart();

			if (type === ShapeTypeEnum.Line) {
				const startEndpoint = this.trySnapEndpoint(localPoint, null);

				const shapeData: ShapeData = {
					id: nextId(),
					type: ShapeTypeEnum.Line,
					properties: {
						base: { x: localPoint.x, y: localPoint.y, width: 0, height: 0 },
						fill: { ...DEFAULT_PROPS.fill },
						stroke: { ...DEFAULT_PROPS.stroke },
						line: {
							start: startEndpoint,
							end: { ...startEndpoint },
							routing: 'straight' as const,
							endArrow: tool === 'arrow',
						},
					},
				};

				this.actionManager.push(new CreateShapeAction([shapeData], this.ioc));

				this.isCreating = true;
				this.startPoint = { x: localPoint.x, y: localPoint.y };
				this.creatingId = shapeData.id;
				this.creatingType = ShapeTypeEnum.Line;
			} else {
				const shapeData: ShapeData = {
					id: nextId(),
					type,
					properties: {
						base: { x: localPoint.x, y: localPoint.y, width: 0, height: 0 },
						fill: { ...DEFAULT_PROPS.fill },
						stroke: { ...DEFAULT_PROPS.stroke },
						text: { ...DEFAULT_PROPS.text },
					},
				};

				this.actionManager.push(new CreateShapeAction([shapeData], this.ioc));

				this.isCreating = true;
				this.startPoint = { x: localPoint.x, y: localPoint.y };
				this.creatingId = shapeData.id;
				this.creatingType = type;
			}

			return false;
		}

		// 文本：保持点击即创建
		return this.createImmediate(tool, localPoint);
	}

	private handlePointerMove(payload: EventPayload): boolean {
		if (!this.isCreating) {
			return true;
		}

		const cur = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);

		if (this.creatingType === ShapeTypeEnum.Line) {
			this.pushLineUpdate(cur);
		} else {
			this.pushBase(this.computeBase(cur));
		}
		return false;
	}

	private handlePointerUp(payload: EventPayload): boolean {
		if (!this.isCreating) {
			return true;
		}
		this.finish(payload);
		return false;
	}

	/** 收尾：应用最终尺寸（拖拽太小则回退默认尺寸）、选中新图形、切回 Select 工具 */
	private finish(payload: EventPayload) {
		const cur = this.viewportService.clientToViewportLocal(
			payload.viewportPoint.x,
			payload.viewportPoint.y,
		);
		const start = this.startPoint!;
		const dx = cur.x - start.x;
		const dy = cur.y - start.y;

		if (this.creatingType === ShapeTypeEnum.Line) {
			const isClick = Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD;
			if (isClick) {
				this.pushLineUpdate({ x: start.x + 100, y: start.y });
			} else {
				this.pushLineUpdate(cur);
			}
		} else {
			const isClick = Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD;
			const defaultSize = DEFAULT_SIZE_BY_SHAPE_TYPE[this.creatingType!] ?? DEFAULT_SIZE;
			const base: BasePropertyValue = isClick
				? {
						x: start.x - defaultSize.width / 2,
						y: start.y - defaultSize.height / 2,
						width: defaultSize.width,
						height: defaultSize.height,
				  }
				: this.computeBase(cur);
			this.pushBase(base);
		}

		this.actionLogManager.setStreamEnd();

		this.selectCreatedShape();

		this.toolService.store.getState().setActiveTool(ToolType.Select);
		this.reset();
	}

	/** 根据当前指针位置计算包围盒；圆保持正方形（直径） */
	private computeBase(cur: { x: number; y: number }): BasePropertyValue {
		const start = this.startPoint!;
		const dx = cur.x - start.x;
		const dy = cur.y - start.y;

		if (this.creatingType === ShapeTypeEnum.Circle) {
			const d = Math.max(Math.abs(dx), Math.abs(dy));
			return {
				x: dx < 0 ? start.x - d : start.x,
				y: dy < 0 ? start.y - d : start.y,
				width: d,
				height: d,
			};
		}

		return {
			x: Math.min(start.x, cur.x),
			y: Math.min(start.y, cur.y),
			width: Math.abs(dx),
			height: Math.abs(dy),
		};
	}

	private pushBase(base: BasePropertyValue) {
		this.actionManager.push(
			new UpdatePropsAction(
				[{ id: this.creatingId!, type: this.creatingType!, properties: { base } }],
				this.ioc,
			),
		);
	}

	private pushLineUpdate(cur: Point) {
		const shape = this.shapeManager.getShapeById(this.creatingId!);
		if (!shape) {
			return;
		}

		const line = shape.getProperty<LineProperty>(ShapePropertyEnum.Line)?.value;
		if (!line) {
			return;
		}

		const endEndpoint = this.trySnapEndpoint(cur, line.start);
		const base = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();

		this.actionManager.push(
			new UpdatePropsAction(
				[
					{
						id: this.creatingId!,
						type: ShapeTypeEnum.Line,
						properties: { base, line: { ...line, end: endEndpoint } },
					},
				],
				this.ioc,
			),
		);
	}

	/** 检测点是否在某图形上，返回带 shapeId/anchor 的端点，否则返回自由坐标端点 */
	private trySnapEndpoint(point: Point, refEndpoint: LineEndpointValue | null): LineEndpointValue {
		const snapShape = this.shapeManager.getShapeByPoint(point);
		if (snapShape?.acceptsConnections && snapShape.id !== this.creatingId) {
			const ref = refEndpoint ?? point;
			const anchorPt = getShapeAnchorPoint(snapShape, 'auto', ref);
			return { x: anchorPt.x, y: anchorPt.y, shapeId: snapShape.id, anchor: 'auto' };
		}
		return { x: point.x, y: point.y };
	}

	private selectCreatedShape() {
		this.selectShape(this.creatingId!);
	}

	private selectShape(shapeId: string) {
		const shape = this.shapeManager.getShapeById(shapeId);
		if (!shape) {
			return;
		}

		// 清理可能残留的旧选中
		this.selectService.getSelectedShapes().forEach((s) => s.setState(ShapeStateEnum.Normal));
		this.selectService.clearSelectedShapes();

		shape.setState(ShapeStateEnum.Selected);
		this.selectService.setSelectedShape(shape);
		this.selectService.updateMultiSelectOverlay([shape]);
	}

	private createImmediate(tool: ToolType, localPoint: { x: number; y: number }): boolean {
		const id = nextId();
		const shapeType = tool === 'text' ? ShapeTypeEnum.Text : ShapeTypeEnum.Line;
		const isText = shapeType === ShapeTypeEnum.Text;

		const shapeData: ShapeData = {
			id,
			type: shapeType,
			properties: {
				base: {
					x: localPoint.x - DEFAULT_SIZE.width / 2,
					y: localPoint.y - DEFAULT_SIZE.height / 2,
					width: DEFAULT_SIZE.width,
					height: DEFAULT_SIZE.height,
				},
				fill: isText ? { ...DEFAULT_PROPS.fill, alpha: 0 } : { ...DEFAULT_PROPS.fill },
				stroke: isText
					? { ...DEFAULT_PROPS.stroke, width: 0, alpha: 0 }
					: { ...DEFAULT_PROPS.stroke },
				...(isText
					? {
							text: {
								...DEFAULT_PROPS.text,
								horizontalAlign: 'left' as const,
								verticalAlign: 'top' as const,
								padding: 0,
							},
					  }
					: {}),
				...(shapeType === ShapeTypeEnum.Line
					? {
							line: {
								start: { x: localPoint.x, y: localPoint.y },
								end: { x: localPoint.x + 100, y: localPoint.y },
								routing: 'straight' as const,
							},
					  }
					: {}),
			},
		};

		this.actionManager.push(new CreateShapeAction([shapeData], this.ioc));
		this.selectShape(id);

		// 新建文本后自动进入编辑态
		if (isText) {
			const shape = this.shapeManager.getShapeById(id);
			shape?.setState(ShapeStateEnum.Edit);
		}

		// 新建后退出创建模式，回到 select
		this.toolService.store.getState().setActiveTool(ToolType.Select);

		return false;
	}

	private reset() {
		this.isCreating = false;
		this.startPoint = null;
		this.creatingId = null;
		this.creatingType = null;
	}
}
