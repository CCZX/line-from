import { expect, test } from '@playwright/test';
import { createSingleRectangleFixture } from './fixtures/shapes';
import {
	clickWorld,
	doubleClickWorld,
	exportShapes,
	importShapes,
	openEditor,
} from './helpers/editor';

test.beforeEach(async ({ page }) => {
	await openEditor(page);
	await importShapes(page, createSingleRectangleFixture());
});

test('可以编辑图形文字并提交', async ({ page }) => {
	await doubleClickWorld(page, { x: 535, y: 300 });

	const textEditor = page.getByRole('textbox', { name: '编辑图形文字' });
	await expect(textEditor).toBeFocused();
	await textEditor.fill('端到端测试');
	await textEditor.press('Control+Enter');

	const shapes = await exportShapes(page);
	expect(shapes[0].properties.text?.text).toBe('端到端测试');
});

test('可以通过样式面板修改描边颜色', async ({ page }) => {
	await clickWorld(page, { x: 535, y: 300 });

	const redStroke = page.getByRole('button', { name: '描边颜色：红色' });
	await expect(redStroke).toBeVisible();
	await redStroke.click();

	const shapes = await exportShapes(page);
	expect(shapes[0].properties.stroke?.color).toBe(0xe03131);
});
