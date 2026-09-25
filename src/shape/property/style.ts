import { Graphics, LINE_CAP, LINE_JOIN } from '@pixi/graphics';
import { RoughGenerator } from 'roughjs/bin/generator';
import { getDiamondPoints } from '../geometry';
import { colorToHex, SHAPE_COLORS } from '@lineform/common/color';

// 直接引用生成器，避免 roughjs 默认入口把 Canvas/SVG 渲染器重复打进首屏 bundle。
const generator = new RoughGenerator();
const SKETCHY_HACHURE_GAP = 9;
const SKETCHY_FILL_ALPHA_FACTOR = 0.72;

interface RoughOp {
	op: string;
	data: number[];
}

interface RoughOpSet {
	ops: RoughOp[];
}

function drawOpSet(g: Graphics, set: RoughOpSet): void {
	for (const op of set.ops) {
		switch (op.op) {
			case 'move':
				g.moveTo(op.data[0], op.data[1]);
				break;
			case 'lineTo':
				g.lineTo(op.data[0], op.data[1]);
				break;
			case 'bcurveTo':
				g.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5]);
				break;
			case 'qcurveTo':
				g.quadraticCurveTo(op.data[0], op.data[1], op.data[2], op.data[3]);
				break;
			case 'curveTo':
				g.bezierCurveTo(op.data[0], op.data[1], op.data[2], op.data[3], op.data[4], op.data[5]);
				break;
		}
	}
}

export function applyLineStyle(
	g: Graphics,
	options: { width: number; color: number; alpha: number },
): void {
	g.lineStyle({
		width: options.width,
		color: options.color,
		alpha: options.alpha,
		cap: LINE_CAP.ROUND,
		join: LINE_JOIN.ROUND,
	});
}

function toRoughOptions(seed: number) {
	return {
		seed,
		roughness: 1.4,
		bowing: 0.9,
	};
}

/**
 * Rough.js 默认会分别随机扰动椭圆的横、纵半径，圆越大越容易显得被压扁。
 * curveFitting 设为 1 后仍保留路径抖动，但不再改变圆的基础长宽比。
 */
function toRoughCircleOptions(seed: number) {
	return {
		...toRoughOptions(seed),
		curveFitting: 1,
	};
}

export function drawSketchyRect(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	seed: number,
): void {
	const drawable = generator.rectangle(x, y, w, h, toRoughOptions(seed));
	for (const set of drawable.sets) {
		drawOpSet(g, set);
	}
}

function getRoundedRectPath(x: number, y: number, w: number, h: number, radius: number): string {
	const r = Math.max(0, Math.min(radius, w / 2, h / 2));
	return [
		`M ${x + r} ${y}`,
		`L ${x + w - r} ${y}`,
		`Q ${x + w} ${y} ${x + w} ${y + r}`,
		`L ${x + w} ${y + h - r}`,
		`Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
		`L ${x + r} ${y + h}`,
		`Q ${x} ${y + h} ${x} ${y + h - r}`,
		`L ${x} ${y + r}`,
		`Q ${x} ${y} ${x + r} ${y}`,
		'Z',
	].join(' ');
}

export function drawSketchyRoundedRect(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	radius: number,
	seed: number,
): void {
	const drawable = generator.path(getRoundedRectPath(x, y, w, h, radius), toRoughOptions(seed));
	for (const set of drawable.sets) {
		drawOpSet(g, set);
	}
}

export function drawSketchyDiamond(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	seed: number,
): void {
	const points = getDiamondPoints(w, h).map(
		(point) => [point.x + x, point.y + y] as [number, number],
	);
	const drawable = generator.polygon(points, toRoughOptions(seed));
	for (const set of drawable.sets) {
		drawOpSet(g, set);
	}
}

export function drawSketchyCircle(
	g: Graphics,
	cx: number,
	cy: number,
	r: number,
	seed: number,
): void {
	const drawable = generator.circle(cx, cy, r * 2, toRoughCircleOptions(seed));
	for (const set of drawable.sets) {
		drawOpSet(g, set);
	}
}

export function drawSketchyLine(g: Graphics, points: Point[], seed: number): void {
	if (points.length < 2) {
		return;
	}

	const roughPoints = points.map((p) => [p.x, p.y] as [number, number]);
	const drawable = generator.curve(roughPoints, toRoughOptions(seed));
	for (const set of drawable.sets) {
		drawOpSet(g, set);
	}
}

/** 从两侧箭翼分别向尖端落笔，形成开放式手绘箭头。 */
export function drawSketchyArrowhead(
	g: Graphics,
	tip: Point,
	wings: [Point, Point],
	seed: number,
): void {
	for (let i = 0; i < wings.length; i++) {
		const wing = wings[i];
		const drawable = generator.line(wing.x, wing.y, tip.x, tip.y, {
			seed: seed + i,
			roughness: 0.95,
			bowing: 0.6,
		});
		for (const set of drawable.sets) {
			drawOpSet(g, set);
		}
	}
}

function drawHachureFill(
	g: Graphics,
	drawable: ReturnType<typeof generator.rectangle>,
	color: number,
	alpha: number,
): void {
	g.lineStyle({
		width: 1,
		color,
		alpha: Math.min(1, alpha * SKETCHY_FILL_ALPHA_FACTOR),
		cap: LINE_CAP.ROUND,
		join: LINE_JOIN.ROUND,
	});
	for (const set of drawable.sets) {
		// rough.js 会把描边和填充分成不同的 set，这里只绘制填充线条
		if ((set as any).type === 'path') {
			continue;
		}
		drawOpSet(g, set);
	}
	g.lineStyle(0);
}

export function drawSketchyFillRect(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	color: number,
	alpha: number,
	seed: number,
): void {
	const drawable = generator.rectangle(x, y, w, h, {
		seed,
		fill: colorToHex(SHAPE_COLORS.background.patternBase),
		fillStyle: 'hachure',
		hachureAngle: 45,
		hachureGap: SKETCHY_HACHURE_GAP,
		roughness: 1.05,
		bowing: 0.65,
	});
	drawHachureFill(g, drawable, color, alpha);
}

export function drawSketchyFillRoundedRect(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	radius: number,
	color: number,
	alpha: number,
	seed: number,
): void {
	const drawable = generator.path(getRoundedRectPath(x, y, w, h, radius), {
		seed,
		fill: colorToHex(SHAPE_COLORS.background.patternBase),
		fillStyle: 'hachure',
		hachureAngle: 45,
		hachureGap: SKETCHY_HACHURE_GAP,
		roughness: 1.05,
		bowing: 0.65,
	});
	drawHachureFill(g, drawable, color, alpha);
}

export function drawSketchyFillDiamond(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	color: number,
	alpha: number,
	seed: number,
): void {
	const points = getDiamondPoints(w, h).map(
		(point) => [point.x + x, point.y + y] as [number, number],
	);
	const drawable = generator.polygon(points, {
		seed,
		fill: colorToHex(SHAPE_COLORS.background.patternBase),
		fillStyle: 'hachure',
		hachureAngle: 45,
		hachureGap: SKETCHY_HACHURE_GAP,
		roughness: 1.05,
		bowing: 0.65,
	});
	drawHachureFill(g, drawable, color, alpha);
}

export function drawSketchyFillCircle(
	g: Graphics,
	cx: number,
	cy: number,
	r: number,
	color: number,
	alpha: number,
	seed: number,
): void {
	const drawable = generator.circle(cx, cy, r * 2, {
		seed,
		fill: colorToHex(SHAPE_COLORS.background.patternBase),
		fillStyle: 'hachure',
		hachureAngle: 45,
		hachureGap: SKETCHY_HACHURE_GAP,
		roughness: 1.05,
		bowing: 0.65,
		curveFitting: 1,
	});
	drawHachureFill(g, drawable, color, alpha);
}
