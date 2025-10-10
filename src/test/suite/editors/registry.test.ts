import * as assert from 'assert';
import { EditorHandlerRegistry } from '../../../editors/registry';
import { createPythonEditorHandler } from '../../../editors/python';

suite('EditorHandlerRegistry Tests', () => {
	let registry: EditorHandlerRegistry;

	setup(() => {
		registry = new EditorHandlerRegistry();
		// Register Python handler
		registry.register('python', createPythonEditorHandler());
	});

	suite('Basic Operations', () => {
		test('Should register and check if language is supported', () => {
			assert.strictEqual(registry.isSupported('python'), true);
			assert.strictEqual(registry.isSupported('typescript'), false);
		});

		test('Should get editor for valid language and style', () => {
			const editor = registry.getEditor('python', 'google');
			assert.ok(editor, 'Editor should be returned');
		});

		test('Should return undefined for unsupported language', () => {
			const editor = registry.getEditor('java', 'google');
			assert.strictEqual(editor, undefined);
		});

		test('Should return undefined for unsupported style', () => {
			const editor = registry.getEditor('python', 'numpy');
			assert.strictEqual(editor, undefined);
		});

		test('Should get default editor', () => {
			const editor = registry.getDefaultEditor('python');
			assert.ok(editor, 'Default editor should be returned');
		});

		test('Should get all supported languages', () => {
			const languages = registry.getSupportedLanguages();
			assert.strictEqual(languages.length, 1);
			assert.strictEqual(languages[0], 'python');
		});

		test('Should get supported styles for a language', () => {
			const styles = registry.getSupportedStyles('python');
			assert.ok(styles.includes('google'));
		});
	});

	suite('Factory Pattern - New Instances', () => {
		test('Should create new editor instance on each getEditor call', () => {
			const editor1 = registry.getEditor('python', 'google');
			const editor2 = registry.getEditor('python', 'google');

			assert.ok(editor1, 'First editor should exist');
			assert.ok(editor2, 'Second editor should exist');

			// They should be different instances
			assert.notStrictEqual(
				editor1,
				editor2,
				'Each getEditor() call should return a NEW instance'
			);
		});

		test('Should not share state between editor instances', () => {
			const docstring1 = `"""
Summary 1.

Args:
    param1 (str): Description 1
"""`;

			const docstring2 = `"""
Summary 2.

Args:
    param2 (int): Description 2
"""`;

			const editor1 = registry.getEditor('python', 'google');
			const editor2 = registry.getEditor('python', 'google');

			assert.ok(editor1);
			assert.ok(editor2);

			// Load different docstrings into each editor
			editor1.load(docstring1);
			editor2.load(docstring2);

			// Each editor should maintain its own state
			const text1 = editor1.getText();
			const text2 = editor2.getText();

			assert.ok(text1.includes('param1'), 'Editor 1 should have param1');
			assert.ok(
				!text1.includes('param2'),
				'Editor 1 should NOT have param2'
			);
			assert.ok(text2.includes('param2'), 'Editor 2 should have param2');
			assert.ok(
				!text2.includes('param1'),
				'Editor 2 should NOT have param1'
			);
		});
	});

	suite('Auto-detect Style', () => {
		test('Should auto-detect Google style', () => {
			const googleDocstring = `"""
Summary.

Args:
    param (str): Description
"""`;

			const editor = registry.getEditorAuto('python', googleDocstring);
			assert.ok(editor, 'Editor should be returned for Google style');
		});

		test('Should auto-detect Sphinx style', () => {
			const sphinxDocstring = `"""
Summary.

:param param: Description
:type param: str
"""`;

			const editor = registry.getEditorAuto('python', sphinxDocstring);
			// Currently returns undefined because Sphinx editor is not implemented
			// TODO: Update this test when Sphinx editor is added
			assert.strictEqual(
				editor,
				undefined,
				'Should return undefined for Sphinx until implemented'
			);
		});

		test('Should fall back to default style for unknown format', () => {
			const unknownDocstring = `"""
Just a simple summary.
"""`;

			const editor = registry.getEditorAuto('python', unknownDocstring);
			assert.ok(editor, 'Should return default editor for unknown format');
		});
	});
});
