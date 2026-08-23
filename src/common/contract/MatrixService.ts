export interface Matrix2D {
	a: number;
	b: number;
	c: number;
	d: number;
	tx: number;
	ty: number;
}

export interface Transform2DOptions {
	x?: number;
	y?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	originX?: number;
	originY?: number;
}

export interface BoxTransform {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation?: number;
}

export interface IMatrixService {
	identityMatrix(): Matrix2D;
	translationMatrix(x: number, y: number): Matrix2D;
	rotationMatrix(degrees: number): Matrix2D;
	scalingMatrix(scaleX: number, scaleY?: number): Matrix2D;
	multiplyMatrices(left: Matrix2D, right: Matrix2D): Matrix2D;
	composeMatrices(...matrices: Matrix2D[]): Matrix2D;
	invertMatrix(matrix: Matrix2D): Matrix2D;
	transformPoint(matrix: Matrix2D, point: Point): Point;
	transformVector(matrix: Matrix2D, vector: Point): Point;
	createTransformMatrix(options?: Transform2DOptions): Matrix2D;
	createBoxTransformMatrix(box: BoxTransform): Matrix2D;
	createRectMappingMatrix(from: Rectangle, to: Rectangle): Matrix2D;
	transformRect(matrix: Matrix2D, rect: Rectangle): Rectangle;
	rotationBetweenVectors(from: Point, to: Point): Matrix2D;
	getMatrixRotation(matrix: Matrix2D): number;
	normalizeDegrees(degrees: number): number;
}

export const IMatrixService = Symbol('IMatrixService');
