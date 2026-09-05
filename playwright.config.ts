import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
	testDir: './tests/e2e',
	outputDir: './test-results',
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI
		? [['github'], ['html', { open: 'never' }]]
		: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:4173',
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		locale: 'zh-CN',
		colorScheme: 'light',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !isCI,
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' },
		},
	],
});
