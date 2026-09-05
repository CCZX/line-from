import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import type { ShapeData } from '@/shape/contract';

interface Point {
	x: number;
	y: number;
}

interface DebugViewport {
	children: unknown[];
	toGlobal(point: Point): Point;
}

interface DebugPixiApplication {
	view: HTMLCanvasElement;
	stage: {
		children: DebugViewport[];
	};
}

type BrowserGlobal = typeof globalThis & {
	__PIXI_APP__?: DebugPixiApplication;
};

export async function openEditor(page: Page): Promise<void> {
	await page.goto('/');

	const canvas = page.locator('.editor-canvas-container canvas');
	await expect(canvas).toBeVisible();
	await page.waitForFunction(() => {
		const app = (globalThis as BrowserGlobal).__PIXI_APP__;
		return Boolean(app?.view.isConnected && app.stage.children[0]);
	});
}

export async function importShapes(page: Page, shapes: ShapeData[]): Promise<void> {
	await page.locator('input[type="file"]').setInputFiles({
		name: 'e2e-shapes.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(shapes)),
	});

	await page.waitForFunction((expectedCount) => {
		const viewport = (globalThis as BrowserGlobal).__PIXI_APP__?.stage.children[0];
		return viewport?.children.length === expectedCount;
	}, shapes.length);
}

export async function exportShapes(page: Page): Promise<ShapeData[]> {
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: '导出 ShapeData JSON' }).click();
	const download = await downloadPromise;
	const path = await download.path();

	if (!path) {
		throw new Error('无法读取导出的 ShapeData 文件。');
	}

	return JSON.parse(await readFile(path, 'utf8')) as ShapeData[];
}

export async function worldToPage(page: Page, point: Point): Promise<Point> {
	return page.evaluate((worldPoint) => {
		const app = (globalThis as BrowserGlobal).__PIXI_APP__;
		const viewport = app?.stage.children[0];
		if (!app || !viewport) {
			throw new Error('Pixi 画布尚未初始化。');
		}

		const canvasRect = app.view.getBoundingClientRect();
		const globalPoint = viewport.toGlobal(worldPoint);
		return {
			x: canvasRect.left + globalPoint.x,
			y: canvasRect.top + globalPoint.y,
		};
	}, point);
}

export async function clickWorld(page: Page, point: Point): Promise<void> {
	const target = await worldToPage(page, point);
	await page.mouse.click(target.x, target.y);
}

export async function doubleClickWorld(page: Page, point: Point): Promise<void> {
	const target = await worldToPage(page, point);
	await page.mouse.dblclick(target.x, target.y, { delay: 50 });
}

export async function dragWorld(page: Page, from: Point, to: Point): Promise<void> {
	const start = await worldToPage(page, from);
	const end = await worldToPage(page, to);

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(end.x, end.y, { steps: 8 });
	await page.mouse.up();
}
