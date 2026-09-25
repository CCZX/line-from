import { AbsProperty } from './AbsProperty';
import { LineEndpointValue, LinePropertyValue, ShapePropertyEnum, StrokeStyle } from '../contract';
import { BaseShape } from '../BaseShape';
import { BaseProperty } from './BaseProperty';
import { StrokeProperty } from './StrokeProperty';
import { applyLineStyle, drawSketchyArrowhead, drawSketchyLine } from './style';
import { catmullRomToBezier, cubicBezierPoint, getShapeAnchorPoint } from '../geometry';
import { Graphics } from '@pixi/graphics';
import { IShapeManager } from '@lineform/domain/contract';
import { IocContainerService } from '@lineform/common/contract';
import { SHAPE_COLORS } from '@lineform/common/color';

const DEFAULT_VALUE: LinePropertyValue = {
	start: { x: 0, y: 0 },
	end: { x: 100, y: 100 },
	routing: 'straight',
};

/** 途经点数量上限 */
export const MAX_MID_POINTS = 1;

export class LineProperty extends AbsProperty<LinePropertyValue> {
	constructor(shape: BaseShape, value?: LinePropertyValue) {
		super(shape, value || DEFAULT_VALUE);
	}

	/** 解析端点：锚定时计算图形上的实际坐标，否则返回自由坐标 */
	public resolveEndpoint(endpoint: LineEndpointValue, refPoint?: Point): Point {
		if (endpoint.shapeId) {
			const ioc = (this.shape as any).context.ioc as IocContainerService;
			const shapeManager = ioc.get<IShapeManager>(IShapeManager);
			const target = shapeManager.getShapeById(endpoint.shapeId);
			if (target) {
				return getShapeAnchorPoint(target, endpoint.anchor, refPoint);
			}
		}
		return { x: endpoint.x, y: endpoint.y };
	}

	/** 世界坐标下的全点序列：start → 途经点 → end（锚定端点自动解析坐标） */
	public getPoints(): Point[] {
		const v = this.value;
		const start = this.resolveEndpoint(v.start, v.end);
		const end = this.resolveEndpoint(v.end, v.start);
		return [start, ...(v.midPoints ?? []), end];
	}

	/** 容器本地坐标下的全点序列 */
	public getLocalPoints(): Point[] {
		return this.toLocal(this.getPoints());
	}

	/**
	 * 每段线的虚拟中点手柄（世界坐标），拖动它可生成途经点；
	 * 途经点已满时返回空数组
	 */
	public getVirtualHandles(): Point[] {
		const midCount = this.value.midPoints?.length ?? 0;
		if (midCount >= MAX_MID_POINTS) {
			return [];
		}

		const points = this.getPoints();
		if (midCount === 0) {
			const [p0, p1] = points;
			return [{ x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }];
		}

		const segments = catmullRomToBezier(points);
		return segments.map((seg, i) => cubicBezierPoint(points[i], seg.c1, seg.c2, seg.to, 0.5));
	}

	/** 容器本地坐标下的虚拟中点手柄 */
	public getLocalVirtualHandles(): Point[] {
		return this.toLocal(this.getVirtualHandles());
	}

	private toLocal(points: Point[]): Point[] {
		const { minX, minY } = this.getBBox();
		return points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
	}

	private getBBox() {
		const points = this.getPoints();
		const xs = points.map((p) => p.x);
		const ys = points.map((p) => p.y);
		return {
			minX: Math.min(...xs),
			minY: Math.min(...ys),
			maxX: Math.max(...xs),
			maxY: Math.max(...ys),
		};
	}

	public draw(): void {
		const v = this.value;
		const g = this.shape.graphics as Graphics;

		const { minX, minY, maxX, maxY } = this.getBBox();

		// 容器定位到包围盒中心
		this.shape.container.x = minX + (maxX - minX) / 2;
		this.shape.container.y = minY + (maxY - minY) / 2;
		this.shape.container.pivot.set((maxX - minX) / 2, (maxY - minY) / 2);

		// 同步 base 包围盒（直接赋值，不触发 BaseProperty.draw 以免覆盖容器定位）
		const baseProp = this.shape.getProperty<BaseProperty>(ShapePropertyEnum.Base);
		if (baseProp) {
			baseProp.value = {
				...baseProp.value,
				x: minX,
				y: minY,
				width: maxX - minX,
				height: maxY - minY,
			};
		}

		// 世界坐标 → 本地坐标
		const points = this.getLocalPoints();

		g.clear();

		// stroke
		const stroke = this.shape.getProperty<StrokeProperty>(ShapePropertyEnum.Stroke);
		const sv = stroke?.value;
		const color = sv?.color ?? SHAPE_COLORS.border.fallback;
		const alpha = sv?.alpha ?? 1;
		const width = sv?.width ?? 1;
		const strokeStyle: StrokeStyle = sv?.style ?? 'regular';
		const seed = sv?.seed;

		// 画线：无途经点为直线，有途经点为平滑曲线
		applyLineStyle(g, { width, color, alpha });
		const start = points[0];
		const end = points[points.length - 1];

		// 箭头切线方向的参考点
		let startTangentFrom = end;
		let endTangentFrom = start;
		if (points.length > 2) {
			const segments = catmullRomToBezier(points);
			startTangentFrom = segments[0].c1;
			endTangentFrom = segments[segments.length - 1].c2;
		}

		const startArrowLength = this.getArrowLength(width, startTangentFrom, start);
		const endArrowLength = this.getArrowLength(width, endTangentFrom, end);
		const isSketchy = strokeStyle === 'sketchy' && seed != null;
		const shaftPoints = points.map((point) => ({ ...point }));
		if (v.startArrow && !isSketchy) {
			shaftPoints[0] = this.insetArrowShaft(start, startTangentFrom, startArrowLength);
		}
		if (v.endArrow && !isSketchy) {
			shaftPoints[shaftPoints.length - 1] = this.insetArrowShaft(
				end,
				endTangentFrom,
				endArrowLength,
			);
		}

		if (isSketchy) {
			drawSketchyLine(g, shaftPoints, seed);
		} else if (points.length === 2) {
			g.moveTo(shaftPoints[0].x, shaftPoints[0].y);
			g.lineTo(shaftPoints[1].x, shaftPoints[1].y);
		} else {
			const segments = catmullRomToBezier(shaftPoints);
			g.moveTo(shaftPoints[0].x, shaftPoints[0].y);
			for (const seg of segments) {
				g.bezierCurveTo(seg.c1.x, seg.c1.y, seg.c2.x, seg.c2.y, seg.to.x, seg.to.y);
			}
		}
		g.lineStyle(0);

		// 普通模式使用实心燕尾箭头；手绘模式使用开放式双笔箭翼。
		if (v.startArrow) {
			this.drawArrowhead(
				g,
				startTangentFrom.x,
				startTangentFrom.y,
				start.x,
				start.y,
				startArrowLength,
				strokeStyle,
				seed == null ? undefined : seed + 101,
				width,
				color,
				alpha,
			);
		}
		if (v.endArrow) {
			this.drawArrowhead(
				g,
				endTangentFrom.x,
				endTangentFrom.y,
				end.x,
				end.y,
				endArrowLength,
				strokeStyle,
				seed == null ? undefined : seed + 202,
				width,
				color,
				alpha,
			);
		}
	}

	private getArrowLength(strokeWidth: number, from: Point, to: Point): number {
		const preferredLength = Math.min(20, Math.max(14, strokeWidth * 4 + 8));
		const tangentLength = Math.hypot(to.x - from.x, to.y - from.y);
		return Math.min(preferredLength, tangentLength * 0.6);
	}

	private insetArrowShaft(tip: Point, toward: Point, arrowLength: number): Point {
		const dx = toward.x - tip.x;
		const dy = toward.y - tip.y;
		const distance = Math.hypot(dx, dy);
		if (distance === 0) {
			return { ...tip };
		}

		const inset = Math.min(arrowLength * 0.62, distance * 0.45);
		return {
			x: tip.x + (dx / distance) * inset,
			y: tip.y + (dy / distance) * inset,
		};
	}

	private drawArrowhead(
		g: Graphics,
		fromX: number,
		fromY: number,
		toX: number,
		toY: number,
		length: number,
		strokeStyle: StrokeStyle,
		seed: number | undefined,
		width: number,
		color: number,
		alpha: number,
	): void {
		const dx = toX - fromX;
		const dy = toY - fromY;
		const distance = Math.hypot(dx, dy);
		if (distance === 0 || length === 0) {
			return;
		}

		const ux = dx / distance;
		const uy = dy / distance;
		const nx = -uy;
		const ny = ux;
		const halfWidth = length * 0.38;
		const baseX = toX - ux * length;
		const baseY = toY - uy * length;
		const notchX = toX - ux * length * 0.62;
		const notchY = toY - uy * length * 0.62;
		const points = [
			{ x: toX, y: toY },
			{ x: baseX + nx * halfWidth, y: baseY + ny * halfWidth },
			{ x: notchX, y: notchY },
			{ x: baseX - nx * halfWidth, y: baseY - ny * halfWidth },
		];

		if (strokeStyle === 'sketchy' && seed != null) {
			applyLineStyle(g, { width, color, alpha });
			drawSketchyArrowhead(g, points[0], [points[1], points[3]], seed);
			g.lineStyle(0);
			return;
		}

		g.beginFill(color, alpha);
		g.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			g.lineTo(points[i].x, points[i].y);
		}
		g.lineTo(points[0].x, points[0].y);
		g.endFill();
	}
}
