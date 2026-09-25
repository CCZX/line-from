import { describe, expect, it } from 'vitest';
import { QuadTreeManager } from '@lineform/domain/service/ShapeManager';

function item(id: string, bounds: Rectangle, order: number) {
	return { id, bounds, order };
}

describe('QuadTreeManager', () => {
	it('只返回与查询区域相交的数据并保持顺序', () => {
		const tree = new QuadTreeManager({
			capacity: 1,
			initialBounds: { x: 0, y: 0, width: 100, height: 100 },
		});
		tree.upsert(item('right', { x: 70, y: 10, width: 10, height: 10 }, 2));
		tree.upsert(item('left-later', { x: 20, y: 10, width: 10, height: 10 }, 1));
		tree.upsert(item('left-first', { x: 10, y: 10, width: 10, height: 10 }, 0));

		expect(tree.query({ x: 0, y: 0, width: 40, height: 40 }).map(({ id }) => id)).toEqual([
			'left-first',
			'left-later',
		]);
	});

	it('跨越象限的数据只返回一次', () => {
		const tree = new QuadTreeManager({
			capacity: 1,
			initialBounds: { x: 0, y: 0, width: 100, height: 100 },
		});
		tree.upsert(item('center', { x: 40, y: 40, width: 20, height: 20 }, 0));
		tree.upsert(item('corner', { x: 10, y: 10, width: 5, height: 5 }, 1));

		expect(tree.query({ x: 0, y: 0, width: 100, height: 100 }).map(({ id }) => id)).toEqual([
			'center',
			'corner',
		]);
	});

	it('upsert 可以移动已有数据且不会产生重复项', () => {
		const tree = new QuadTreeManager({ initialBounds: { x: 0, y: 0, width: 100, height: 100 } });
		tree.upsert(item('shape', { x: 10, y: 10, width: 10, height: 10 }, 0));
		tree.upsert(item('shape', { x: 80, y: 80, width: 10, height: 10 }, 0));

		expect(tree.query({ x: 0, y: 0, width: 30, height: 30 })).toEqual([]);
		expect(tree.query({ x: 70, y: 70, width: 30, height: 30 }).map(({ id }) => id)).toEqual([
			'shape',
		]);
		expect(tree.size).toBe(1);
	});

	it('数据超出初始范围时动态扩展根节点', () => {
		const tree = new QuadTreeManager({ initialBounds: { x: 0, y: 0, width: 16, height: 16 } });
		tree.upsert(item('near', { x: 1, y: 1, width: 2, height: 2 }, 0));
		tree.upsert(item('far', { x: 100_000, y: -100_000, width: 20, height: 20 }, 1));

		expect(
			tree.query({ x: 99_999, y: -100_001, width: 30, height: 30 }).map(({ id }) => id),
		).toEqual(['far']);
		expect(tree.query({ x: 0, y: 0, width: 5, height: 5 }).map(({ id }) => id)).toEqual(['near']);
	});

	it('支持删除、清空和负方向查询矩形', () => {
		const tree = new QuadTreeManager();
		tree.upsert(item('shape', { x: 10, y: 10, width: 10, height: 10 }, 0));

		expect(tree.query({ x: 30, y: 30, width: -25, height: -25 }).map(({ id }) => id)).toEqual([
			'shape',
		]);
		expect(tree.remove('shape')).toBe(true);
		expect(tree.remove('shape')).toBe(false);
		expect(tree.size).toBe(0);

		tree.upsert(item('another', { x: 0, y: 0, width: 1, height: 1 }, 0));
		tree.clear();
		expect(tree.query({ x: -10, y: -10, width: 20, height: 20 })).toEqual([]);
	});
});
