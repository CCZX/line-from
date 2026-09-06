import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { createSingleRectangleFixture } from './fixtures/shapes';
import { clickWorld, exportShapes, importShapes, openEditor } from './helpers/editor';

test.beforeEach(async ({ page }) => {
	await openEditor(page);
});

test('工具栏支持方向键导航，缩放菜单支持键盘打开和关闭', async ({ page }) => {
	const selectTool = page.getByRole('button', { name: '选择 (V)' });
	const rectangleTool = page.getByRole('button', { name: '矩形 (R)' });

	await selectTool.focus();
	await selectTool.press('ArrowRight');
	await expect(rectangleTool).toBeFocused();
	await rectangleTool.press('Space');
	await expect(rectangleTool).toHaveAttribute('aria-pressed', 'true');

	const zoomMenuTrigger = page.getByRole('button', { name: /重置缩放，\d+%/ });
	await zoomMenuTrigger.focus();
	await zoomMenuTrigger.press('Enter');
	await expect(page.getByRole('menu')).toBeVisible();
	await expect(page.getByRole('menuitem', { name: /重置缩放/ })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: '缩放全览' })).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(page.getByRole('menu')).toBeHidden();
	await expect(zoomMenuTrigger).toBeFocused();
});

test('属性控件支持折叠、方向键选择和滑块键盘调整', async ({ page }) => {
	await importShapes(page, createSingleRectangleFixture());
	await clickWorld(page, { x: 535, y: 300 });

	const collapseButton = page.getByRole('button', { name: '收起样式面板' });
	await collapseButton.click();
	const expandButton = page.getByRole('button', { name: '展开样式面板' });
	await expect(expandButton).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByRole('group', { name: '描边样式' })).toBeHidden();
	await expandButton.click();

	const regularStyle = page.getByRole('button', { name: '规正' });
	const sketchyStyle = page.getByRole('button', { name: '手绘' }).first();
	await regularStyle.focus();
	await regularStyle.press('ArrowRight');
	await expect(sketchyStyle).toBeFocused();
	await sketchyStyle.press('Space');

	const opacitySlider = page.getByRole('slider', { name: '背景透明度' });
	await opacitySlider.focus();
	await opacitySlider.press('ArrowLeft');

	const shapes = await exportShapes(page);
	expect(shapes[0].properties.stroke?.style).toBe('sketchy');
	expect(shapes[0].properties.fill?.alpha).toBeCloseTo(0.99, 2);
});

test('导入无效 JSON 时使用非阻塞通知反馈', async ({ page }) => {
	await page.locator('input[type="file"]').setInputFiles({
		name: 'invalid.json',
		mimeType: 'application/json',
		buffer: Buffer.from('{ invalid json'),
	});

	await expect(
		page.locator('.ui-toast').getByText('导入失败：请选择有效的 ShapeData JSON 文件。'),
	).toBeVisible();
});
