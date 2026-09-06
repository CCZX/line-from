import { expect, test } from '@playwright/test';
import { dragWorld, exportShapes, importShapes, openEditor } from './helpers/editor';

test.beforeEach(async ({ page }) => {
	await openEditor(page);
});

test('启动后显示工具栏和 Pixi 画布', async ({ page }) => {
	const pageErrors: Error[] = [];
	page.on('pageerror', (error) => pageErrors.push(error));

	await expect(page).toHaveTitle('线构');
	await expect(page.getByRole('toolbar', { name: '画布工具栏' })).toBeVisible();
	await expect(page.locator('.editor-canvas-container canvas')).toBeVisible();
	await expect(page.getByRole('heading', { name: '开始画点什么吧' })).toBeVisible();
	await expect(page.getByRole('button', { name: '打开示例画布' })).toBeVisible();
	expect(pageErrors).toEqual([]);
});

test('可以从空状态一键生成示例图形', async ({ page }) => {
	await page.getByRole('button', { name: '打开示例画布' }).click();

	await expect(page.getByRole('heading', { name: '开始画点什么吧' })).toBeHidden();
	const shapes = await exportShapes(page);
	expect(shapes.length).toBeGreaterThan(0);
	expect(shapes.some(({ id }) => id === 'agent-loop-goal')).toBe(true);
});

test('可以拖拽创建矩形并导出准确的图形数据', async ({ page }) => {
	await importShapes(page, []);
	await page.getByRole('button', { name: '矩形 (R)' }).click();
	await dragWorld(page, { x: 300, y: 220 }, { x: 430, y: 310 });

	const shapes = await exportShapes(page);
	expect(shapes).toHaveLength(1);
	expect(shapes[0].type).toBe('rectangle');
	expect(shapes[0].properties.base.x).toBeCloseTo(300, 1);
	expect(shapes[0].properties.base.y).toBeCloseTo(220, 1);
	expect(shapes[0].properties.base.width).toBeCloseTo(130, 1);
	expect(shapes[0].properties.base.height).toBeCloseTo(90, 1);
	await expect(page.getByRole('button', { name: '选择 (V)' })).toHaveAttribute(
		'aria-pressed',
		'true',
	);
});
