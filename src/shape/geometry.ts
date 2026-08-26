import { BaseShape } from './BaseShape';
import { BasePropertyValue, LineEndpointValue, ShapePropertyEnum } from './contract';
import { BaseProperty } from './property/BaseProperty';

/**
 * 点在矩形内
 * @param point
 * @param rect
 */
export function isPointInRect(point: Point, rect: Rectangle) {
	const { x: px, y: py } = point;

	if (px < rect.x) {
		return false;
	}

	if (px > rect.x + rect.width) {
		return false;
	}

	if (py < rect.y) {
		return false;
	}

	if (py > rect.y + rect.height) {
		return false;
	}

	return true;
}

export function getRoundedRectRadius(width: number, height: number): number {
	return Math.max(0, Math.min(16, width / 4, height / 4));
}

export function isPointInRoundedRect(
	point: Point,
	width: number,
	height: number,
	radius = getRoundedRectRadius(width, height),
): boolean {
	if (!isPointInRect(point, { x: 0, y: 0, width, height })) {
		return false;
	}

	const r = Math.max(0, Math.min(radius, width / 2, height / 2));
	if (
		r === 0 ||
		(point.x >= r && point.x <= width - r) ||
		(point.y >= r && point.y <= height - r)
	) {
		return true;
	}

	const centerX = point.x < r ? r : width - r;
	const centerY = point.y < r ? r : height - r;
	return Math.hypot(point.x - centerX, point.y - centerY) <= r;
}

export function getDiamondPoints(width: number, height: number): Point[] {
	return [
		{ x: width / 2, y: 0 },
		{ x: width, y: height / 2 },
		{ x: width / 2, y: height },
		{ x: 0, y: height / 2 },
	];
}

export function isPointInDiamond(point: Point, width: number, height: number): boolean {
	if (width <= 0 || height <= 0) {
		return false;
	}

	return (
		Math.abs(point.x - width / 2) / (width / 2) + Math.abs(point.y - height / 2) / (height / 2) <= 1
	);
}

/**
 * 两个矩形是否相交
 */
export function isRectIntersect(rect1: Rectangle, rect2: Rectangle) {
	return !(
		rect1.x + rect1.width < rect2.x ||
		rect2.x + rect2.width < rect1.x ||
		rect1.y + rect1.height < rect2.y ||
		rect2.y + rect2.height < rect1.y
	);
}

/**
 * 计算多个图形的世界坐标 AABB
 */
export function getShapesAABB(shapes: BaseShape[]): Rectangle {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;

	for (const shape of shapes) {
		const { width, height } = shape.getBounds();
		const cx = shape.container.x;
		const cy = shape.container.y;
		const angle = shape.container.angle;

		if (angle === 0) {
			const left = cx - width / 2;
			const top = cy - height / 2;
			minX = Math.min(minX, left);
			minY = Math.min(minY, top);
			maxX = Math.max(maxX, left + width);
			maxY = Math.max(maxY, top + height);
		} else {
			// 旋转后四个角坐标
			const rad = (angle * Math.PI) / 180;
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);
			const hw = width / 2;
			const hh = height / 2;
			const corners = [
				{ x: -hw, y: -hh },
				{ x: hw, y: -hh },
				{ x: hw, y: hh },
				{ x: -hw, y: hh },
			];
			for (const c of corners) {
				const rx = c.x * cos - c.y * sin + cx;
				const ry = c.x * sin + c.y * cos + cy;
				minX = Math.min(minX, rx);
				minY = Math.min(minY, ry);
				maxX = Math.max(maxX, rx);
				maxY = Math.max(maxY, ry);
			}
		}
	}

	if (!isFinite(minX)) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export interface BezierSegment {
	c1: Point;
	c2: Point;
	to: Point;
}

/**
 * Catmull-Rom 样条转三次贝塞尔（端点 clamp），曲线平滑经过所有输入点。
 * 返回 points.length - 1 段，第 i 段从 points[i] 到 points[i+1]
 */
export function catmullRomToBezier(points: Point[]): BezierSegment[] {
	const segments: BezierSegment[] = [];

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i - 1] ?? points[i];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2] ?? points[i + 1];

		segments.push({
			c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
			c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
			to: p2,
		});
	}

	return segments;
}

/**
 * 三次贝塞尔曲线上 t 处的点
 */
export function cubicBezierPoint(from: Point, c1: Point, c2: Point, to: Point, t: number): Point {
	const mt = 1 - t;
	const a = mt * mt * mt;
	const b = 3 * mt * mt * t;
	const c = 3 * mt * t * t;
	const d = t * t * t;

	return {
		x: a * from.x + b * c1.x + c * c2.x + d * to.x,
		y: a * from.y + b * c1.y + c * c2.y + d * to.y,
	};
}

/**
 * 点到线段的最短距离
 */
export function distToSegment(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lenSq = dx * dx + dy * dy;
	let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * 把经过给定点的路径离散成折线采样点：2 点为直线，多点按 Catmull-Rom 曲线采样
 */
export function sampleCurvePoints(points: Point[], samplesPerSegment = 16): Point[] {
	if (points.length <= 2) {
		return [...points];
	}

	const segments = catmullRomToBezier(points);
	const out: Point[] = [points[0]];
	segments.forEach((seg, i) => {
		for (let s = 1; s <= samplesPerSegment; s++) {
			out.push(cubicBezierPoint(points[i], seg.c1, seg.c2, seg.to, s / samplesPerSegment));
		}
	});
	return out;
}

export type ShapeSideAnchor = Exclude<NonNullable<LineEndpointValue['anchor']>, 'auto' | 'center'>;

export interface NearestShapeAnchor {
	anchor: ShapeSideAnchor;
	point: Point;
}

/** 根据参考点选出矩形四边中最近的锚点。 */
export function getNearestAnchorPoint(
	base: BasePropertyValue,
	refPoint: Point,
): NearestShapeAnchor {
	const { x, y, width, height } = base;
	const cx = x + width / 2;
	const cy = y + height / 2;
	const sides: NearestShapeAnchor[] = [
		{ anchor: 'top', point: { x: cx, y } },
		{ anchor: 'right', point: { x: x + width, y: cy } },
		{ anchor: 'bottom', point: { x: cx, y: y + height } },
		{ anchor: 'left', point: { x, y: cy } },
	];

	let nearest = sides[0];
	let nearestDistance = Infinity;
	for (const side of sides) {
		const distance = Math.hypot(side.point.x - refPoint.x, side.point.y - refPoint.y);
		if (distance < nearestDistance) {
			nearest = side;
			nearestDistance = distance;
		}
	}
	return nearest;
}

/** 计算图形某方向锚点的世界坐标 */
export function getAnchorPoint(
	base: BasePropertyValue,
	anchor: LineEndpointValue['anchor'] = 'auto',
	refPoint?: Point,
): Point {
	const { x, y, width, height } = base;
	const cx = x + width / 2;
	const cy = y + height / 2;

	if (anchor === 'top') {
		return { x: cx, y };
	}
	if (anchor === 'bottom') {
		return { x: cx, y: y + height };
	}
	if (anchor === 'left') {
		return { x, y: cy };
	}
	if (anchor === 'right') {
		return { x: x + width, y: cy };
	}
	if (anchor === 'center') {
		return { x: cx, y: cy };
	}

	// auto: 根据参考点选最近边的中点，无参考点则 center
	if (!refPoint) {
		return { x: cx, y: cy };
	}
	return getNearestAnchorPoint(base, refPoint).point;
}

/** 从图形实例获取锚点世界坐标 */
export function getShapeAnchorPoint(
	shape: BaseShape,
	anchor: LineEndpointValue['anchor'] = 'auto',
	refPoint?: Point,
): Point {
	const base = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
	const rotation = base.rotation ?? 0;
	if (rotation === 0) {
		return getAnchorPoint(base, anchor, refPoint);
	}

	const center = {
		x: base.x + base.width / 2,
		y: base.y + base.height / 2,
	};
	const radians = (rotation * Math.PI) / 180;

	// auto 需要先把参考点逆旋转到图形本地朝向，再判断距离最近的边。
	const localRef = refPoint ? rotatePoint(refPoint, center, -radians) : undefined;
	const unrotatedAnchor = getAnchorPoint(base, anchor, localRef);
	return rotatePoint(unrotatedAnchor, center, radians);
}

/** 根据当前拖拽端点选择图形最近的一边，并返回可持久化的明确锚点方向。 */
export function getNearestShapeAnchor(shape: BaseShape, refPoint: Point): NearestShapeAnchor {
	const base = shape.getProperty<BaseProperty>(ShapePropertyEnum.Base).get();
	const rotation = base.rotation ?? 0;
	if (rotation === 0) {
		return getNearestAnchorPoint(base, refPoint);
	}

	const center = {
		x: base.x + base.width / 2,
		y: base.y + base.height / 2,
	};
	const radians = (rotation * Math.PI) / 180;
	const localRef = rotatePoint(refPoint, center, -radians);
	const nearest = getNearestAnchorPoint(base, localRef);
	return {
		anchor: nearest.anchor,
		point: rotatePoint(nearest.point, center, radians),
	};
}

function rotatePoint(point: Point, center: Point, radians: number): Point {
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return {
		x: center.x + dx * cos - dy * sin,
		y: center.y + dx * sin + dy * cos,
	};
}
