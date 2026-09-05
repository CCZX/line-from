import { expect, test } from '@playwright/test';
import { createSingleRectangleFixture } from './fixtures/shapes';
import { exportShapes, importShapes, openEditor } from './helpers/editor';

test('ShapeData 导入后可以无损导出', async ({ page }) => {
	await openEditor(page);
	const fixture = createSingleRectangleFixture();

	await importShapes(page, fixture);

	await expect(page.getByRole('button', { name: '撤销 (Ctrl+Z)' })).toBeDisabled();
	const exportedShapes = await exportShapes(page);
	expect(exportedShapes).toEqual(fixture);
});
