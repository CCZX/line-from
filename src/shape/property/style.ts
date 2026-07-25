import { Graphics, LINE_CAP, LINE_JOIN } from 'pixi.js';
import rough from 'roughjs';

const generator = rough.generator();

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

export function drawSketchyCircle(
	g: Graphics,
	cx: number,
	cy: number,
	r: number,
	seed: number,
): void {
	const drawable = generator.circle(cx, cy, r * 2, toRoughOptions(seed));
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

function drawHachureFill(
	g: Graphics,
	drawable: ReturnType<typeof generator.rectangle>,
	color: number,
	alpha: number,
): void {
	g.lineStyle({
		width: 1,
		color,
		alpha,
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
		fill: '#ffffff',
		fillStyle: 'hachure',
		hachureAngle: 45,
		hachureGap: 6,
		roughness: 1.2,
		bowing: 0.8,
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
		fill: '#ffffff',
		fillStyle: 'hachure',
		hachureAngle: 45,
		hachureGap: 6,
		roughness: 1.2,
		bowing: 0.8,
	});
	drawHachureFill(g, drawable, color, alpha);
}
