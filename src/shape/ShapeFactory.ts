import type { ShapeContext, ShapeData } from './contract';
import { ShapePropertyEnum, ShapeTypeEnum } from './contract';
import type { BaseShape } from './BaseShape';
import { Circle } from './Circle';
import { Diamond } from './Diamond';
import { Line } from './Line';
import { Rectangle } from './Rectangle';
import { RoundedRectangle } from './RoundedRectangle';
import { Text } from './Text';

type ShapeConstructor = new (id: string, context: ShapeContext) => BaseShape;

const SHAPE_CONSTRUCTORS: Record<ShapeTypeEnum, ShapeConstructor> = {
	[ShapeTypeEnum.Circle]: Circle,
	[ShapeTypeEnum.Rectangle]: Rectangle,
	[ShapeTypeEnum.RoundedRectangle]: RoundedRectangle,
	[ShapeTypeEnum.Diamond]: Diamond,
	[ShapeTypeEnum.Text]: Text,
	[ShapeTypeEnum.Line]: Line,
};

/** 根据持久化数据创建并初始化图形；类型分派只保留在此边界。 */
export function createShapeFromData(
	data: ShapeData,
	context: ShapeContext,
	fallbackType?: ShapeTypeEnum,
): BaseShape | null {
	const Shape = SHAPE_CONSTRUCTORS[data.type] ?? (fallbackType && SHAPE_CONSTRUCTORS[fallbackType]);
	if (!Shape) {
		return null;
	}

	const shape = new Shape(data.id, context);
	const { base, fill, stroke, text, line } = data.properties;

	shape.setProperty(ShapePropertyEnum.Base, { ...base });
	if (fill) {
		shape.setProperty(ShapePropertyEnum.Fill, fill);
	}
	if (stroke) {
		shape.setProperty(ShapePropertyEnum.Stroke, stroke);
	}
	if (text) {
		shape.setProperty(ShapePropertyEnum.Text, text);
	}
	if (line) {
		shape.setProperty(ShapePropertyEnum.Line, line);
	}

	return shape;
}
