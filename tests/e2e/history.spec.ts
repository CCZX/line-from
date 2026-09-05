import { expect, test } from '@playwright/test';
import { createSingleRectangleFixture } from './fixtures/shapes';
import { dragWorld, exportShapes, importShapes, openEditor } from './helpers/editor';

test('移动图形后可以撤销和重做', async ({ page }) => {
	await openEditor(page);
	const fixture = createSingleRectangleFixture();
	await importShapes(page, fixture);

	await dragWorld(page, { x: 535, y: 300 }, { x: 605, y: 340 });
	let shapes = await exportShapes(page);
	expect(shapes[0].properties.base.x).toBeCloseTo(520, 1);
	expect(shapes[0].properties.base.y).toBeCloseTo(280, 1);

	await page.getByRole('button', { name: '撤销 (Ctrl+Z)' }).click();
	shapes = await exportShapes(page);
	expect(shapes[0].properties.base).toMatchObject({
		x: fixture[0].properties.base.x,
		y: fixture[0].properties.base.y,
		width: fixture[0].properties.base.width,
		height: fixture[0].properties.base.height,
	});

	await page.getByRole('button', { name: '重做 (Ctrl+Shift+Z)' }).click();
	shapes = await exportShapes(page);
	expect(shapes[0].properties.base.x).toBeCloseTo(520, 1);
	expect(shapes[0].properties.base.y).toBeCloseTo(280, 1);
});
