import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonSignatureAnalyzer } from '../../../analyzers/python/signatureAnalyzer';
import { DiagnosticCode } from '../../../diagnostics/types';
import {
    createTestFunction,
    createTestDocstring,
    createTestParameter,
    createTestDocstringParameter,
    TEST_URI
} from './testUtils';

suite('PythonSignatureAnalyzer - Missing Parameters Tests', () => {
    let analyzer: PythonSignatureAnalyzer;

    setup(() => {
        analyzer = new PythonSignatureAnalyzer();
    });

    suite('DSV102: Parameter in code but missing in docstring', () => {
        test('Should detect single missing parameter', () => {
            const func = createTestFunction({
                parameters: [createTestParameter('name', 'str')]
            });

            const docstring = createTestDocstring({
                parameters: []
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const missing = diagnostics.find(d => d.code === DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);

            assert.ok(missing, 'Should detect missing parameter');
            assert.ok(missing!.message.includes('name'));
            assert.ok(missing!.message.includes('Add it to the Args section'), 'Should have actionable hint');
            assert.strictEqual(missing!.severity, vscode.DiagnosticSeverity.Warning);
        });

        test('Should include related information pointing to function', () => {
            const func = createTestFunction({
                name: 'calculate',
                parameters: [createTestParameter('x', 'int')]
            });

            const docstring = createTestDocstring({
                parameters: []
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const missing = diagnostics.find(d => d.code === DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);

            assert.ok(missing, 'Should detect missing parameter');
            assert.ok(missing!.relatedInformation, 'Should have related information');
            assert.strictEqual(missing!.relatedInformation!.length, 1);

            const relatedInfo = missing!.relatedInformation![0];
            assert.strictEqual(relatedInfo.location.uri.toString(), TEST_URI.toString());
            assert.ok(relatedInfo.message.includes('x'), 'Related info should mention parameter name');
        });

        test('Should detect multiple missing parameters', () => {
            const func = createTestFunction({
                parameters: [
                    createTestParameter('x', 'int'),
                    createTestParameter('y', 'str'),
                    createTestParameter('z', 'bool')
                ]
            });

            const docstring = createTestDocstring({
                parameters: []
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const missing = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);

            assert.strictEqual(missing.length, 3, 'Should detect all missing parameters');
        });

        test('Should skip implicit parameters (self, cls)', () => {
            const func = createTestFunction({
                parameters: [
                    createTestParameter('self', null),
                    createTestParameter('name', 'str')
                ]
            });

            const docstring = createTestDocstring({
                parameters: []
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const missing = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);

            assert.strictEqual(missing.length, 1, 'Should skip self parameter');
            assert.ok(missing[0].message.includes('name'));
        });
    });

    suite('DSV101: Parameter in docstring but missing in code', () => {
        test('Should detect single extra parameter', () => {
            const func = createTestFunction({
                parameters: []
            });

            const docstring = createTestDocstring({
                parameters: [createTestDocstringParameter('name', 'str', 'Name')]
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const extra = diagnostics.find(d => d.code === DiagnosticCode.PARAM_MISSING_IN_CODE);

            assert.ok(extra, 'Should detect extra parameter');
            assert.ok(extra!.message.includes('name'));
            assert.ok(
                extra!.message.includes('Remove it from docstring') ||
                extra!.message.includes('add to function signature'),
                'Should have actionable hint'
            );
            assert.strictEqual(extra!.severity, vscode.DiagnosticSeverity.Warning);
        });

        test('Should detect multiple extra parameters', () => {
            const func = createTestFunction({
                parameters: []
            });

            const docstring = createTestDocstring({
                parameters: [
                    createTestDocstringParameter('x', 'int', 'X'),
                    createTestDocstringParameter('y', 'str', 'Y')
                ]
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const extra = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_MISSING_IN_CODE);

            assert.strictEqual(extra.length, 2, 'Should detect all extra parameters');
        });

        test('Should skip implicit parameters even if documented', () => {
            const func = createTestFunction({
                parameters: [createTestParameter('self', null)]
            });

            const docstring = createTestDocstring({
                parameters: [
                    createTestDocstringParameter('self', 'MyClass', 'Instance'),
                    createTestDocstringParameter('name', 'str', 'Name')
                ]
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const extra = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_MISSING_IN_CODE);

            assert.strictEqual(extra.length, 1, 'Should skip self parameter');
            assert.ok(extra[0].message.includes('name'));
        });
    });

    suite('Combined DSV101 and DSV102', () => {
        test('Should detect both missing and extra parameters', () => {
            const func = createTestFunction({
                parameters: [
                    createTestParameter('x', 'int'),
                    createTestParameter('y', 'str')
                ]
            });

            const docstring = createTestDocstring({
                parameters: [
                    createTestDocstringParameter('y', 'str', 'Y'),  // matches
                    createTestDocstringParameter('z', 'bool', 'Z')  // extra in docstring
                ]
            });

            const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
            const missing = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);
            const extra = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_MISSING_IN_CODE);

            assert.strictEqual(missing.length, 1, 'Should detect x missing in docstring');
            assert.ok(missing[0].message.includes('x'));

            assert.strictEqual(extra.length, 1, 'Should detect z extra in docstring');
            assert.ok(extra[0].message.includes('z'));
        });
    });
});
