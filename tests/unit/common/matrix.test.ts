import { describe, expect, it } from 'vitest';
import { MatrixService } from '@/common/service/MatrixService';

describe('二维仿射矩阵', () => {
	const matrixService = new MatrixService();

	it('按缩放、旋转、平移的顺序组合变换', () => {
		const matrix = matrixService.composeMatrices(
			matrixService.translationMatrix(10, 20),
			matrixService.rotationMatrix(90),
			matrixService.scalingMatrix(2, 3),
		);

		const point = matrixService.transformPoint(matrix, { x: 4, y: 5 });
		expect(point.x).toBeCloseTo(-5);
		expect(point.y).toBeCloseTo(28);
	});

	it('通过逆矩阵完成世界坐标与本地坐标往返', () => {
		const matrix = matrixService.createTransformMatrix({
			x: 120,
			y: 80,
			rotation: 35,
			scaleX: 1.5,
			scaleY: 0.75,
			originX: 50,
			originY: 30,
		});
		const local = { x: 12, y: 44 };
		const world = matrixService.transformPoint(matrix, local);
		const restored = matrixService.transformPoint(matrixService.invertMatrix(matrix), world);

		expect(restored.x).toBeCloseTo(local.x);
		expect(restored.y).toBeCloseTo(local.y);
	});

	it('计算绕中心旋转后的 AABB', () => {
		const matrix = matrixService.createTransformMatrix({
			x: 100,
			y: 200,
			rotation: 90,
			originX: 40,
			originY: 20,
		});

		const bounds = matrixService.transformRect(matrix, {
			x: 0,
			y: 0,
			width: 80,
			height: 40,
		});
		expect(bounds.x).toBeCloseTo(80);
		expect(bounds.y).toBeCloseTo(160);
		expect(bounds.width).toBeCloseTo(40);
		expect(bounds.height).toBeCloseTo(80);
	});

	it('由两个方向向量得到旋转增量', () => {
		const delta = matrixService.rotationBetweenVectors({ x: 0, y: -10 }, { x: 10, y: 0 });
		expect(matrixService.getMatrixRotation(delta)).toBeCloseTo(90);
	});

	it('把源矩形中的点映射到目标矩形', () => {
		const matrix = matrixService.createRectMappingMatrix(
			{ x: 10, y: 20, width: 100, height: 50 },
			{ x: 30, y: 40, width: 200, height: 150 },
		);

		expect(matrixService.transformPoint(matrix, { x: 10, y: 20 })).toEqual({
			x: 30,
			y: 40,
		});
		expect(matrixService.transformPoint(matrix, { x: 110, y: 70 })).toEqual({
			x: 230,
			y: 190,
		});
	});
});
