import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonSideEffectsAnalyzer } from '../../../analyzers/python/sideEffectsAnalyzer';
import { FunctionDescriptor } from '../../../parsers/types';
import { DocstringDescriptor } from '../../../docstring/types';
import { DiagnosticCode } from '../../../diagnostics/types';
import { TEST_URI } from './testUtils';

suite('PythonSideEffectsAnalyzer Test Suite', () => {
	let analyzer: PythonSideEffectsAnalyzer;

	setup(() => {
		analyzer = new PythonSideEffectsAnalyzer();
	});

	/**
	 * Helper to create a function descriptor with side effects
	 */
	function createFunctionWithSideEffects(
		hasIO: boolean,
		hasGlobalMods: boolean,
		docstring: string | null = 'Test docstring'
	): FunctionDescriptor {
		return {
			name: 'test_function',
			range: new vscode.Range(0, 0, 5, 0),
			parameters: [],
			returnType: null,
			returnStatements: [],
			yieldStatements: [],
			isGenerator: false,
			isAsync: false,
			raises: [],
			docstring: docstring,
			docstringRange: docstring ? new vscode.Range(1, 0, 3, 0) : null,
			hasIO: hasIO,
			hasGlobalMods: hasGlobalMods,
		};
	}

	/**
	 * Helper to create a docstring descriptor
	 */
	function createDocstring(notes: string | null = null): DocstringDescriptor {
		return {
			parameters: [],
			returns: null,
			raises: [],
			notes: notes,
		};
	}

	test('DSV401: Detects file I/O without documentation', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring();

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].code, DiagnosticCode.SIDE_EFFECT_UNDOCUMENTED);
		assert.ok(diagnostics[0].message.includes('I/O operations'));
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Information);
	});

	test('DSV401: Detects global modifications without documentation', () => {
		const func = createFunctionWithSideEffects(false, true);
		const docstring = createDocstring();

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].code, DiagnosticCode.SIDE_EFFECT_UNDOCUMENTED);
		assert.ok(diagnostics[0].message.includes('global/nonlocal variable modifications'));
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Information);
	});

	test('DSV401: Detects multiple side effects without documentation', () => {
		const func = createFunctionWithSideEffects(true, true);
		const docstring = createDocstring();

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].code, DiagnosticCode.SIDE_EFFECT_UNDOCUMENTED);
		assert.ok(diagnostics[0].message.includes('I/O operations'));
		assert.ok(diagnostics[0].message.includes('global/nonlocal variable modifications'));
		assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Information);
	});

	test('No error when I/O is documented with "side effect" keyword', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('This function has side effects: writes to a file.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when I/O is documented with "file" keyword', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('Writes data to file.txt file.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when I/O is documented with "i/o" keyword', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('Performs I/O operations.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when I/O is documented with "prints" keyword', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('Prints debug information to stdout.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when global mods are documented with "global" keyword', () => {
		const func = createFunctionWithSideEffects(false, true);
		const docstring = createDocstring('Modifies global counter variable.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when global mods are documented with "modifies" keyword', () => {
		const func = createFunctionWithSideEffects(false, true);
		const docstring = createDocstring('Modifies shared state.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when side effects are documented with "writes to" phrase', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('Writes to the database.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when side effects are documented with "saves" keyword', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('Saves configuration to disk.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when side effects are documented with "creates file" phrase', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('Creates file if it does not exist.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error when multiple side effects are documented', () => {
		const func = createFunctionWithSideEffects(true, true);
		const docstring = createDocstring('Side effects: modifies global state and writes to file.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error for pure function without side effects', () => {
		const func = createFunctionWithSideEffects(false, false);
		const docstring = createDocstring();

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('No error for function without docstring', () => {
		const func = createFunctionWithSideEffects(true, true, null);
		const docstring = createDocstring();

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('Case-insensitive detection of keywords', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring('SIDE EFFECTS: I/O OPERATIONS.');

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});

	test('Diagnostic points to docstring range', () => {
		const func = createFunctionWithSideEffects(true, false);
		const docstring = createDocstring();

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 1);
		assert.deepStrictEqual(diagnostics[0].range, func.docstringRange);
	});

	test('No error when notes is null but no side effects', () => {
		const func = createFunctionWithSideEffects(false, false);
		const docstring = createDocstring(null);

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

		assert.strictEqual(diagnostics.length, 0);
	});
});
