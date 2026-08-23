import { provide } from 'inversify-binding-decorators';
import {
	IMatrixService,
	type BoxTransform,
	type Matrix2D,
	type Transform2DOptions,
} from '../contract/MatrixService';

const SINGULAR_EPSILON = 1e-12;

/** 提供项目统一的二维仿射矩阵运算。 */
@provide(IMatrixService)
export class MatrixService implements IMatrixService {
	public identityMatrix(): Matrix2D {
		return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
	}

	public translationMatrix(x: number, y: number): Matrix2D {
		return { a: 1, b: 0, c: 0, d: 1, tx: x, ty: y };
	}

	public rotationMatrix(degrees: number): Matrix2D {
		const radians = (degrees * Math.PI) / 180;
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);
		return { a: cos, b: sin, c: -sin, d: cos, tx: 0, ty: 0 };
	}

	public scalingMatrix(scaleX: number, scaleY = scaleX): Matrix2D {
		return { a: scaleX, b: 0, c: 0, d: scaleY, tx: 0, ty: 0 };
	}

	/** 返回 left × right；点会先经过 right，再经过 left。 */
	public multiplyMatrices(left: Matrix2D, right: Matrix2D): Matrix2D {
		return {
			a: left.a * right.a + left.c * right.b,
			b: left.b * right.a + left.d * right.b,
			c: left.a * right.c + left.c * right.d,
			d: left.b * right.c + left.d * right.d,
			tx: left.a * right.tx + left.c * right.ty + left.tx,
			ty: left.b * right.tx + left.d * right.ty + left.ty,
		};
	}

	/** 按书写顺序组合矩阵，例如 T × R × S 表示点依次经过 S、R、T。 */
	public composeMatrices(...matrices: Matrix2D[]): Matrix2D {
		return matrices.reduce(
			(result, matrix) => this.multiplyMatrices(result, matrix),
			this.identityMatrix(),
		);
	}

	public invertMatrix(matrix: Matrix2D): Matrix2D {
		const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
		if (Math.abs(determinant) < SINGULAR_EPSILON) {
			throw new Error('无法求逆：二维变换矩阵不可逆');
		}

		const inverseDeterminant = 1 / determinant;
		const a = matrix.d * inverseDeterminant;
		const b = -matrix.b * inverseDeterminant;
		const c = -matrix.c * inverseDeterminant;
		const d = matrix.a * inverseDeterminant;

		return {
			a,
			b,
			c,
			d,
			tx: -(a * matrix.tx + c * matrix.ty),
			ty: -(b * matrix.tx + d * matrix.ty),
		};
	}

	public transformPoint(matrix: Matrix2D, point: Point): Point {
		return {
			x: matrix.a * point.x + matrix.c * point.y + matrix.tx,
			y: matrix.b * point.x + matrix.d * point.y + matrix.ty,
		};
	}

	/** 忽略平移分量，只变换方向向量。 */
	public transformVector(matrix: Matrix2D, vector: Point): Point {
		return {
			x: matrix.a * vector.x + matrix.c * vector.y,
			y: matrix.b * vector.x + matrix.d * vector.y,
		};
	}

	/** 创建绕 origin 缩放、旋转后再定位到 (x, y) 的矩阵。 */
	public createTransformMatrix(options: Transform2DOptions = {}): Matrix2D {
		const {
			x = 0,
			y = 0,
			rotation = 0,
			scaleX = 1,
			scaleY = 1,
			originX = 0,
			originY = 0,
		} = options;

		return this.composeMatrices(
			this.translationMatrix(x, y),
			this.rotationMatrix(rotation),
			this.scalingMatrix(scaleX, scaleY),
			this.translationMatrix(-originX, -originY),
		);
	}

	/** 创建将左上角为 (0, 0) 的图形绕自身中心变换到世界坐标的矩阵。 */
	public createBoxTransformMatrix(box: BoxTransform): Matrix2D {
		return this.createTransformMatrix({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
			rotation: box.rotation ?? 0,
			originX: box.width / 2,
			originY: box.height / 2,
		});
	}

	/** 把一个矩形的坐标空间映射到另一个矩形。 */
	public createRectMappingMatrix(from: Rectangle, to: Rectangle): Matrix2D {
		if (from.width === 0 || from.height === 0) {
			throw new Error('无法创建矩形映射：源矩形尺寸不能为 0');
		}

		return this.composeMatrices(
			this.translationMatrix(to.x, to.y),
			this.scalingMatrix(to.width / from.width, to.height / from.height),
			this.translationMatrix(-from.x, -from.y),
		);
	}

	/** 计算矩形四个角变换后的轴对齐包围盒。 */
	public transformRect(matrix: Matrix2D, rect: Rectangle): Rectangle {
		const corners = [
			this.transformPoint(matrix, { x: rect.x, y: rect.y }),
			this.transformPoint(matrix, { x: rect.x + rect.width, y: rect.y }),
			this.transformPoint(matrix, { x: rect.x + rect.width, y: rect.y + rect.height }),
			this.transformPoint(matrix, { x: rect.x, y: rect.y + rect.height }),
		];
		const xs = corners.map(({ x }) => x);
		const ys = corners.map(({ y }) => y);
		const minX = Math.min(...xs);
		const minY = Math.min(...ys);
		const maxX = Math.max(...xs);
		const maxY = Math.max(...ys);

		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	}

	/** 根据起止方向向量创建旋转矩阵。零长度向量视为无旋转。 */
	public rotationBetweenVectors(from: Point, to: Point): Matrix2D {
		const lengthProduct = Math.hypot(from.x, from.y) * Math.hypot(to.x, to.y);
		if (lengthProduct < SINGULAR_EPSILON) {
			return this.identityMatrix();
		}

		const cos = (from.x * to.x + from.y * to.y) / lengthProduct;
		const sin = (from.x * to.y - from.y * to.x) / lengthProduct;
		return { a: cos, b: sin, c: -sin, d: cos, tx: 0, ty: 0 };
	}

	public getMatrixRotation(matrix: Matrix2D): number {
		return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
	}

	public normalizeDegrees(degrees: number): number {
		return ((degrees % 360) + 360) % 360;
	}
}
