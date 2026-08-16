import { ShapeTypeEnum, type ShapeData } from '@/shape/contract';

type UnknownRecord = Record<string, unknown>;

const SHAPE_TYPES = new Set<string>(Object.values(ShapeTypeEnum));
const FILL_STYLES = new Set(['solid', 'sketchy']);
const STROKE_STYLES = new Set(['regular', 'sketchy']);
const LINE_ROUTING_TYPES = new Set(['straight', 'orthogonal', 'curved']);
const LINE_ANCHORS = new Set(['auto', 'top', 'right', 'bottom', 'left', 'center']);

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalNumber(value: unknown): boolean {
	return value === undefined || isFiniteNumber(value);
}

function isOptionalString(value: unknown): boolean {
	return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
	return value === undefined || typeof value === 'boolean';
}

function isPoint(value: unknown): value is UnknownRecord & { x: number; y: number } {
	return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isEndpoint(value: unknown): boolean {
	return (
		isPoint(value) &&
		isOptionalString(value.shapeId) &&
		(value.anchor === undefined ||
			(typeof value.anchor === 'string' && LINE_ANCHORS.has(value.anchor)))
	);
}

function isBaseProperty(value: unknown): boolean {
	return (
		isRecord(value) &&
		isFiniteNumber(value.x) &&
		isFiniteNumber(value.y) &&
		isFiniteNumber(value.width) &&
		value.width >= 0 &&
		isFiniteNumber(value.height) &&
		value.height >= 0 &&
		isOptionalNumber(value.rotation)
	);
}

function isFillProperty(value: unknown): boolean {
	return (
		isRecord(value) &&
		isFiniteNumber(value.color) &&
		isFiniteNumber(value.alpha) &&
		(value.style === undefined ||
			(typeof value.style === 'string' && FILL_STYLES.has(value.style))) &&
		isOptionalNumber(value.seed)
	);
}

function isStrokeProperty(value: unknown): boolean {
	return (
		isRecord(value) &&
		isFiniteNumber(value.color) &&
		isFiniteNumber(value.width) &&
		value.width >= 0 &&
		isFiniteNumber(value.alpha) &&
		(value.style === undefined ||
			(typeof value.style === 'string' && STROKE_STYLES.has(value.style))) &&
		isOptionalNumber(value.seed)
	);
}

function isTextProperty(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.text === 'string' &&
		isOptionalNumber(value.color) &&
		isOptionalNumber(value.fontSize) &&
		isOptionalString(value.fontFamily) &&
		(value.fontWeight === undefined ||
			value.fontWeight === 'normal' ||
			value.fontWeight === 'bold') &&
		(value.horizontalAlign === undefined ||
			value.horizontalAlign === 'left' ||
			value.horizontalAlign === 'center' ||
			value.horizontalAlign === 'right') &&
		(value.verticalAlign === undefined ||
			value.verticalAlign === 'top' ||
			value.verticalAlign === 'middle' ||
			value.verticalAlign === 'bottom') &&
		isOptionalNumber(value.lineHeight) &&
		isOptionalNumber(value.padding)
	);
}

function isLineProperty(value: unknown): boolean {
	return (
		isRecord(value) &&
		isEndpoint(value.start) &&
		isEndpoint(value.end) &&
		(value.midPoints === undefined ||
			(Array.isArray(value.midPoints) && value.midPoints.every(isPoint))) &&
		(value.routing === undefined ||
			(typeof value.routing === 'string' && LINE_ROUTING_TYPES.has(value.routing))) &&
		isOptionalBoolean(value.startArrow) &&
		isOptionalBoolean(value.endArrow)
	);
}

function isShapeData(value: unknown, ids: Set<string>): value is ShapeData {
	if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '') {
		return false;
	}
	if (ids.has(value.id) || typeof value.type !== 'string' || !SHAPE_TYPES.has(value.type)) {
		return false;
	}
	if (!isRecord(value.properties) || !isBaseProperty(value.properties.base)) {
		return false;
	}

	const { fill, stroke, text, line } = value.properties;
	if (
		(fill !== undefined && !isFillProperty(fill)) ||
		(stroke !== undefined && !isStrokeProperty(stroke)) ||
		(text !== undefined && !isTextProperty(text)) ||
		(line !== undefined && !isLineProperty(line))
	) {
		return false;
	}

	ids.add(value.id);
	return true;
}

export function parseShapeDataJson(json: string): ShapeData[] {
	const value: unknown = JSON.parse(json);
	if (!Array.isArray(value)) {
		throw new Error('ShapeData JSON must be an array.');
	}

	const ids = new Set<string>();
	if (!value.every((item) => isShapeData(item, ids))) {
		throw new Error('ShapeData JSON contains an invalid shape.');
	}

	return value;
}
