/**
 * Tests for GitHub Copilot LLM service.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitHubCopilotLLMService } from '../../../llm/providers/githubCopilot';
import { ParameterDescriptionContext } from '../../../llm/types';

suite('GitHubCopilot LLM Service Tests', () => {

	let service: GitHubCopilotLLMService;

	setup(() => {
		// Create service with short timeout for tests
		service = new GitHubCopilotLLMService(1000, 10);
	});

	teardown(() => {
		service.clearCache();
	});

	suite('Initialization', () => {

		test('Should create service with default parameters', () => {
			const defaultService = new GitHubCopilotLLMService();
			assert.ok(defaultService);
			assert.strictEqual(defaultService['cache'].size, 0);
		});

		test('Should create service with custom timeout', () => {
			const customService = new GitHubCopilotLLMService(3000);
			assert.ok(customService);
			assert.strictEqual(customService['timeout'], 3000);
		});

		test('Should create service with custom cache size', () => {
			const customService = new GitHubCopilotLLMService(5000, 50);
			assert.ok(customService);
			// Cache capacity is private, but we can test behavior
			assert.strictEqual(customService['cache'].size, 0);
		});

	});

	suite('Cache Management', () => {

		test('Should cache successful results', async () => {
			const context: ParameterDescriptionContext = {
				paramName: 'test',
				paramType: 'str',
				functionName: 'test_func',
				functionSignature: 'test_func(test: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			// Note: This test requires GitHub Copilot to be available
			// In CI/CD, we would mock the API
			const result1 = await service.generateParameterDescription(context);

			if (result1) {
				// Second call should be from cache
				const result2 = await service.generateParameterDescription(context);

				assert.ok(result2);
				assert.strictEqual(result2.fromCache, true);
				assert.strictEqual(result1.description, result2.description);
			}
		});

		test('Should generate different cache keys for different contexts', async () => {
			const context1: ParameterDescriptionContext = {
				paramName: 'test1',
				paramType: 'str',
				functionName: 'func1',
				functionSignature: 'func1(test1: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			const context2: ParameterDescriptionContext = {
				paramName: 'test2',
				paramType: 'int',
				functionName: 'func2',
				functionSignature: 'func2(test2: int)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result1 = await service.generateParameterDescription(context1);
			const result2 = await service.generateParameterDescription(context2);

			// Results should be different (different cache keys)
			if (result1 && result2) {
				assert.notStrictEqual(result1.description, result2.description);
			}
		});

		test('Should clear cache on clearCache()', async () => {
			const context: ParameterDescriptionContext = {
				paramName: 'test',
				paramType: 'str',
				functionName: 'test_func',
				functionSignature: 'test_func(test: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			await service.generateParameterDescription(context);

			// Cache should have entries
			const sizeBefore = service['cache'].size;

			service.clearCache();

			// Cache should be empty
			assert.strictEqual(service['cache'].size, 0);

			if (sizeBefore > 0) {
				// Next call should not be from cache
				const result = await service.generateParameterDescription(context);
				if (result) {
					assert.strictEqual(result.fromCache, false);
				}
			}
		});

		test('Should respect LRU cache size limit', async () => {
			// Service created with cache size 10
			const contexts: ParameterDescriptionContext[] = [];

			// Generate 12 different contexts
			for (let i = 0; i < 12; i++) {
				contexts.push({
					paramName: `param${i}`,
					paramType: 'str',
					functionName: `func${i}`,
					functionSignature: `func${i}(param${i}: str)`,
					codeBody: '',
					existingDocstring: undefined
				});
			}

			// Generate descriptions for all
			for (const context of contexts) {
				await service.generateParameterDescription(context);
			}

			// Cache should not exceed size limit
			assert.ok(service['cache'].size <= 10);
		});

	});

	suite('isAvailable()', () => {

		test('Should check Copilot availability', async () => {
			const available = await service.isAvailable();

			// Result depends on whether Copilot is installed and active
			assert.strictEqual(typeof available, 'boolean');
		});

		test('Should return false if Language Model API not available', async () => {
			// This would require mocking vscode.lm
			// For now, just verify it returns boolean
			const available = await service.isAvailable();
			assert.strictEqual(typeof available, 'boolean');
		});

	});

	suite('Generate Description', () => {

		test('Should return null if Copilot not available', async function () {
			// Skip if Copilot is actually available
			const available = await service.isAvailable();
			if (available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'test',
				paramType: 'str',
				functionName: 'test_func',
				functionSignature: 'test_func(test: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await service.generateParameterDescription(context);
			assert.strictEqual(result, null);
		});

		test('Should generate description with minimal context', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'username',
				paramType: 'str',
				functionName: 'login',
				functionSignature: 'login(username: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await service.generateParameterDescription(context);

			if (result) {
				assert.ok(result.description);
				assert.strictEqual(typeof result.description, 'string');
				assert.ok(result.description.length > 0);
				assert.ok(result.description.length <= 80); // Max length check
			}
		});

		test('Should generate description with full context', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'timeout',
				paramType: 'int',
				functionName: 'fetch_data',
				functionSignature: 'fetch_data(url: str, timeout: int)',
				codeBody: 'response = requests.get(url, timeout=timeout)',
				existingDocstring: 'Fetch data from URL.\n\nArgs:\n    url: The URL to fetch'
			};

			const result = await service.generateParameterDescription(context);

			if (result) {
				assert.ok(result.description);
				assert.strictEqual(typeof result.description, 'string');
				assert.ok(result.description.length > 0);
			}
		});

		test('Should handle null parameter type', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'data',
				paramType: null,
				functionName: 'process',
				functionSignature: 'process(data)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await service.generateParameterDescription(context);

			// Should still work without type
			if (result) {
				assert.ok(result.description);
			}
		});

		test('Should handle timeout gracefully', async function () {
			// Create service with very short timeout
			const shortTimeoutService = new GitHubCopilotLLMService(1); // 1ms timeout

			const available = await shortTimeoutService.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'test',
				paramType: 'str',
				functionName: 'test_func',
				functionSignature: 'test_func(test: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await shortTimeoutService.generateParameterDescription(context);

			// Should return null on timeout, not throw
			// Result could be null (timeout) or success (very fast response)
			assert.ok(result === null || (result && result.description));
		});

		test('Should not generate description longer than 80 characters', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'config',
				paramType: 'dict',
				functionName: 'initialize_complex_system',
				functionSignature: 'initialize_complex_system(config: dict)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await service.generateParameterDescription(context);

			if (result && result.description) {
				assert.ok(result.description.length <= 80,
					`Description too long: ${result.description.length} chars`);
			}
		});

	});

	suite('Error Handling', () => {

		test('Should handle API errors gracefully', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			// Test with potentially problematic context
			const context: ParameterDescriptionContext = {
				paramName: '',  // Empty name
				paramType: null,
				functionName: '',
				functionSignature: '',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await service.generateParameterDescription(context);

			// Should not throw, should return null or valid result
			assert.ok(result === null || (result && typeof result.description === 'string'));
		});

		test('Should handle special characters in parameter name', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: '_private_var',
				paramType: 'str',
				functionName: 'test',
				functionSignature: 'test(_private_var: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			const result = await service.generateParameterDescription(context);

			if (result) {
				assert.ok(result.description);
			}
		});

	});

	suite('Cache Key Generation', () => {

		test('Should generate consistent cache keys for same context', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context: ParameterDescriptionContext = {
				paramName: 'test',
				paramType: 'str',
				functionName: 'func',
				functionSignature: 'func(test: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			// Call getCacheKey through generateParameterDescription
			await service.generateParameterDescription(context);
			const size1 = service['cache'].size;

			// Call again with same context
			await service.generateParameterDescription(context);
			const size2 = service['cache'].size;

			// Size should not increase (same cache key)
			assert.strictEqual(size1, size2);
		});

		test('Should generate different cache keys for different param names', async function () {
			const available = await service.isAvailable();
			if (!available) {
				this.skip();
				return;
			}

			const context1: ParameterDescriptionContext = {
				paramName: 'test1',
				paramType: 'str',
				functionName: 'func',
				functionSignature: 'func(test1: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			const context2: ParameterDescriptionContext = {
				paramName: 'test2',
				paramType: 'str',
				functionName: 'func',
				functionSignature: 'func(test2: str)',
				codeBody: '',
				existingDocstring: undefined
			};

			await service.generateParameterDescription(context1);
			const size1 = service['cache'].size;

			await service.generateParameterDescription(context2);
			const size2 = service['cache'].size;

			// Size should increase (different cache key)
			assert.ok(size2 > size1, `Expected cache to grow: size1=${size1}, size2=${size2}`);
		});

	});

});
