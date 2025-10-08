import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('akrisanov.docstring-verifier'));
	});

	test('Extension should activate', async function () {
		this.timeout(10000);

		const ext = vscode.extensions.getExtension('akrisanov.docstring-verifier');
		await ext?.activate();

		assert.ok(ext?.isActive, 'Extension should be activated');
	});
});
