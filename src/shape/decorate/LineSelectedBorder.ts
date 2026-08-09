import { Graphics } from 'pixi.js';
import { DECORATE_COLORS } from '@/common/color';
import { ShapeDecorateTypeEnum, ShapePropertyEnum } from '../contract';
import { BaseShape } from '../BaseShape';
import { AbsDecorate, type DecorateViewport } from './AbsDecorate';
import { LineProperty } from '../property/LineProperty';

const ENDPOINT_RADIUS = 5;
const MID_POINT_RADIUS = 5;
const VIRTUAL_HANDLE_RADIUS = 4;
const VIRTUAL_HANDLE_ALPHA = 0.4;
const ANCHORED_ENDPOINT_INNER_RADIUS = 2;

/**
 * 线的选中装饰：端点手柄 + 途经点手柄 + 虚拟中点手柄（拖动可生成途经点）。
 * 占用 SelectedBorder 槽位，复用状态机对选中装饰的激活逻辑。
 */
export class LineSelectedBorder extends AbsDecorate {
	public type: ShapeDecorateTypeEnum = ShapeDecorateTypeEnum.SelectedBorder;

	public graphics: Graphics;

	constructor(shape: BaseShape, viewport: DecorateViewport) {
		super(shape, viewport);
		this.graphics = new Graphics();
		this.graphics.name = ShapeDecorateTypeEnum.SelectedBorder;
	}

	private draw() {
		const line = this.shape.getProperty<LineProperty>(ShapePropertyEnum.Line);
		if (!line) {
			return;
		}

		const points = line.getLocalPoints();
		const start = points[0];
		const end = points[points.length - 1];
		const midPoints = points.slice(1, -1);
		const v = line.value;
		const scale = this.getViewportScale();
		const lineWidth = 1 / scale;

		this.graphics.clear();

		// 虚拟中点手柄（半透明）
		for (const p of line.getLocalVirtualHandles()) {
			this.graphics.lineStyle(lineWidth, DECORATE_COLORS.hoverBorder, VIRTUAL_HANDLE_ALPHA);
			this.graphics.beginFill(DECORATE_COLORS.handleSurface, VIRTUAL_HANDLE_ALPHA);
			this.graphics.drawCircle(p.x, p.y, VIRTUAL_HANDLE_RADIUS / scale);
			this.graphics.endFill();
		}

		// 途经点（实心）
		for (const p of midPoints) {
			this.graphics.lineStyle(lineWidth, DECORATE_COLORS.handleSurface, 1);
			this.graphics.beginFill(DECORATE_COLORS.activeAccent, 1);
			this.graphics.drawCircle(p.x, p.y, MID_POINT_RADIUS / scale);
			this.graphics.endFill();
		}

		// 起点
		this.drawEndpoint(start, !!v.start.shapeId, scale);
		// 终点
		this.drawEndpoint(end, !!v.end.shapeId, scale);
	}

	private drawEndpoint(p: Point, anchored: boolean, scale: number) {
		if (anchored) {
			// 与工具栏选中态保持一致：柔和底色 + 紫色描边和中心点。
			this.graphics.lineStyle(2 / scale, DECORATE_COLORS.activeAccent, 1);
			this.graphics.beginFill(DECORATE_COLORS.controlSurface, 1);
			this.graphics.drawCircle(p.x, p.y, ENDPOINT_RADIUS / scale);
			this.graphics.endFill();

			this.graphics.lineStyle(0);
			this.graphics.beginFill(DECORATE_COLORS.activeAccent, 1);
			this.graphics.drawCircle(p.x, p.y, ANCHORED_ENDPOINT_INNER_RADIUS / scale);
		} else {
			this.graphics.lineStyle(1 / scale, DECORATE_COLORS.activeAccent, 1);
			this.graphics.beginFill(DECORATE_COLORS.controlSurface, 1);
			this.graphics.drawCircle(p.x, p.y, ENDPOINT_RADIUS / scale);
		}
		this.graphics.endFill();
	}

	public onActivate() {
		this.draw();
		this.shape.container.addChild(this.graphics);
		this.startViewportScaleSync();
	}

	public refresh() {
		this.draw();
	}

	public onDeactivate() {
		this.stopViewportScaleSync();
		this.shape.container.removeChild(this.graphics);
	}
}
