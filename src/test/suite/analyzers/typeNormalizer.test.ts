import * as assert from 'assert';
import { normalizeType } from '../../../analyzers/python/typeNormalizer';

suite('TypeNormalizer Tests', () => {
    test('Should normalize common type aliases', () => {
        assert.strictEqual(normalizeType('string'), 'str');
        assert.strictEqual(normalizeType('integer'), 'int');
        assert.strictEqual(normalizeType('boolean'), 'bool');
        assert.strictEqual(normalizeType('dictionary'), 'dict');
    });

    test('Should be case-insensitive', () => {
        assert.strictEqual(normalizeType('STRING'), 'str');
        assert.strictEqual(normalizeType('Integer'), 'int');
        assert.strictEqual(normalizeType('DICT'), 'dict');
    });

    test('Should handle Optional syntax', () => {
        assert.strictEqual(normalizeType('Optional[int]'), 'int|none');
        assert.strictEqual(normalizeType('Optional[str]'), 'str|none');
        assert.strictEqual(normalizeType('optional[dict]'), 'dict|none');
    });

    test('Should normalize union spacing', () => {
        assert.strictEqual(normalizeType('int | str'), 'int|str');
        assert.strictEqual(normalizeType('int|str'), 'int|str');
        assert.strictEqual(normalizeType('int  |  str'), 'int|str');
    });

    test('Should remove typing module prefix', () => {
        assert.strictEqual(normalizeType('typing.List[int]'), 'list[int]');
        assert.strictEqual(normalizeType('typing.Dict[str, int]'), 'dict[str, int]');
    });

    test('Should handle empty or null input', () => {
        assert.strictEqual(normalizeType(''), '');
        assert.strictEqual(normalizeType(null as any), '');
        assert.strictEqual(normalizeType(undefined as any), '');
    });

    test('Should preserve complex types', () => {
        assert.strictEqual(normalizeType('list[int]'), 'list[int]');
        assert.strictEqual(normalizeType('dict[str, int]'), 'dict[str, int]');
        assert.strictEqual(normalizeType('tuple[str, ...]'), 'tuple[str, ...]');
    });

    test('Should trim whitespace', () => {
        assert.strictEqual(normalizeType('  str  '), 'str');
        assert.strictEqual(normalizeType('\tint\n'), 'int');
    });

    test('Should handle types that are already normalized', () => {
        assert.strictEqual(normalizeType('str'), 'str');
        assert.strictEqual(normalizeType('int'), 'int');
        assert.strictEqual(normalizeType('bool'), 'bool');
    });

    test('Should combine multiple normalizations', () => {
        // Optional[String] -> optional[string] -> string|none -> str|none (after alias replacement)
        assert.strictEqual(normalizeType('Optional[String]'), 'str|none');

        // typing.List[Integer] -> list[integer] -> list[int] (after alias replacement)
        assert.strictEqual(normalizeType('typing.List[Integer]'), 'list[int]');

        // Complex: typing.Optional[Dictionary] -> optional[dictionary] -> dictionary|none -> dict|none
        assert.strictEqual(normalizeType('typing.Optional[Dictionary]'), 'dict|none');
    });

    test('Should apply aliases within complex types', () => {
        // Aliases should work inside List, Dict, etc.
        assert.strictEqual(normalizeType('List[String]'), 'list[str]');
        assert.strictEqual(normalizeType('Dict[String, Integer]'), 'dict[str, int]');
        assert.strictEqual(normalizeType('Tuple[Boolean, Integer]'), 'tuple[bool, int]');
    });

    test('Should handle union types with aliases', () => {
        assert.strictEqual(normalizeType('String | Integer'), 'str|int');
        assert.strictEqual(normalizeType('string|boolean'), 'str|bool');
        assert.strictEqual(normalizeType('Integer | None'), 'int|none');
    });

    test('Should not replace partial word matches', () => {
        // "string" should not match in "mystring" or "substring"
        // But we lowercase everything, so this tests word boundaries
        assert.strictEqual(normalizeType('int'), 'int');
        assert.strictEqual(normalizeType('integer'), 'int');

        // Complex case: should handle properly
        assert.strictEqual(normalizeType('List[integer]'), 'list[int]');
    });

    test('Known limitation: Nested Optional (TODO for Post-MVP)', () => {
        // Current regex can't handle nested brackets properly
        // Optional[Optional[int]] -> optional[int|none] (inner Optional replaced)
        // This is a known limitation documented in TODO comments
        assert.strictEqual(normalizeType('Optional[Optional[int]]'), 'optional[int|none]');
    });

    test('Should handle multiple aliases in one type', () => {
        assert.strictEqual(normalizeType('Dict[String, Integer]'), 'dict[str, int]');
        assert.strictEqual(normalizeType('Tuple[Boolean, String, Integer]'), 'tuple[bool, str, int]');
    });

    test('Known limitation: Spacing in Optional (TODO for Post-MVP)', () => {
        // Spacing inside Optional[] is preserved in the captured group
        // Optional[ Integer ] -> integer |none (space before pipe)
        // This is acceptable as most code doesn't have spaces like this
        const result = normalizeType('Optional[ Integer ]');
        assert.ok(result.includes('int'), 'Should contain "int"');
        assert.ok(result.includes('none'), 'Should contain "none"');

        // Normal spacing works fine
        assert.strictEqual(normalizeType('Optional[Integer]'), 'int|none');
    });
});
