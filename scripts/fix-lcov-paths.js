#!/usr/bin/env node
/**
 * Fix lcov.info paths to be relative to project root
 * VS Code test runner sometimes generates incorrect paths
 */

const fs = require('fs');
const path = require('path');

const lcovPath = path.join(__dirname, '../coverage/lcov.info');

if (!fs.existsSync(lcovPath)) {
	console.error('❌ lcov.info not found at:', lcovPath);
	process.exit(1);
}

const stats = fs.statSync(lcovPath);
if (stats.size === 0) {
	console.error('❌ lcov.info is empty (0 bytes)');
	console.error('This usually means coverage was not generated properly.');
	console.error('Check if tests ran successfully.');
	process.exit(1);
}

let content = fs.readFileSync(lcovPath, 'utf8');

// Ensure all SF: paths are relative to project root (src/...)
// Remove any absolute paths or incorrect prefixes
content = content.replace(/^SF:.*[\/\\]src[\/\\]/gm, 'SF:src/');
content = content.replace(/^SF:(?!src[\/\\])(.+)/gm, (match, filepath) => {
	// If path doesn't start with src/, try to fix it
	const pathSep = filepath.includes('\\') ? '\\' : '/';
	const srcPattern = `${pathSep}src${pathSep}`;
	if (filepath.includes(srcPattern)) {
		const srcIndex = filepath.indexOf(srcPattern);
		return `SF:${filepath.substring(srcIndex + 1).replace(/\\/g, '/')}`;
	}
	return match;
});

// Normalize all path separators to forward slashes
content = content.replace(/^SF:(.+)$/gm, (match, filepath) => {
	return `SF:${filepath.replace(/\\/g, '/')}`;
});

fs.writeFileSync(lcovPath, content, 'utf8');

console.log('✓ Fixed lcov.info paths');
console.log('First 5 SF: entries:');
const sfLines = content.match(/^SF:.+$/gm);
if (sfLines) {
	sfLines.slice(0, 5).forEach(line => console.log('  ' + line));
}
