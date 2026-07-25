import { Graphics } from 'pixi.js';
import { HOVER_BORDER } from '../color';
import { ShapeDecorateTypeEnum, ShapePropertyEnum } from '../contract';
import { BaseShape } from '../BaseShape';
import { AbsDecorate } from './AbsDecorate';
import { LineProperty } from '../property/LineProperty';

const ENDPOINT_RADIUS = 5;
const MID_POINT_RADIUS = 5;
const VIRTUAL_HANDLE_RADIUS = 4;
const VIRTUAL_HANDLE_ALPHA = 0.4;
const ANCHOR_COLOR = 0x4caf50;

/**
 * 线的选中装饰：端点手柄 + 途经点手柄 + 虚拟中点手柄（拖动可生成途经点）。
 * 占用 SelectedBorder 槽位，复用状态机对选中装饰的激活逻辑。
 */
export class LineSelectedBorder extends AbsDecorate {
	public type: ShapeDecorateTypeEnum = ShapeDecorateTypeEnum.SelectedBorder;

	public graphics: Graphics;

	constructor(shape: BaseShape) {
		super(shape);
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

		this.graphics.clear();

		// 虚拟中点手柄（半透明）
		for (const p of line.getLocalVirtualHandles()) {
			this.graphics.lineStyle(1, HOVER_BORDER, VIRTUAL_HANDLE_ALPHA);
			this.graphics.beginFill(0xffffff, VIRTUAL_HANDLE_ALPHA);
			this.graphics.drawCircle(p.x, p.y, VIRTUAL_HANDLE_RADIUS);
			this.graphics.endFill();
		}

		// 途经点（实心）
		for (const p of midPoints) {
			this.graphics.lineStyle(1, 0xffffff, 1);
			this.graphics.beginFill(HOVER_BORDER, 1);
			this.graphics.drawCircle(p.x, p.y, MID_POINT_RADIUS);
			this.graphics.endFill();
		}

		// 起点
		this.drawEndpoint(start, !!v.start.shapeId);
		// 终点
		this.drawEndpoint(end, !!v.end.shapeId);
	}

	private drawEndpoint(p: Point, anchored: boolean) {
		if (anchored) {
			this.graphics.lineStyle(1, ANCHOR_COLOR, 1);
			this.graphics.beginFill(ANCHOR_COLOR, 1);
		} else {
			this.graphics.lineStyle(1, HOVER_BORDER, 1);
			this.graphics.beginFill(0xffffff, 1);
		}
		this.graphics.drawCircle(p.x, p.y, ENDPOINT_RADIUS);
		this.graphics.endFill();
	}

	public onActivate() {
		this.draw();
		this.shape.container.addChild(this.graphics);
	}

	public refresh() {
		this.draw();
	}

	public onDeactivate() {
		this.shape.container.removeChild(this.graphics);
	}
}
