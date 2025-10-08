import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	coverage: {
		output: './coverage',
		includeAll: true,
		exclude: ['**/node_modules/**', '**/out/test/**', '**/dist/**'],
		reporter: ['text', 'lcov', 'text-summary'],
	},
});
