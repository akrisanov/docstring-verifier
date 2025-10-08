#!/usr/bin/env node
/**
 * Validate lcov.info file for Codecov compatibility
 * Checks:
 * - File exists
 * - Paths are relative to project root
 * - All referenced source files exist
 * - LCOV format is valid
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const lcovPath = path.join(projectRoot, 'coverage/lcov.info');

console.log('🔍 Validating LCOV coverage report...\n');

// Check if lcov.info exists
if (!fs.existsSync(lcovPath)) {
	console.error('❌ Error: lcov.info not found at:', lcovPath);
	console.log('\n💡 Run: pnpm run test:coverage\n');
	process.exit(1);
}

const content = fs.readFileSync(lcovPath, 'utf8');
const lines = content.split('\n');

// Extract all SF (source file) entries
const sourceFiles = [];
const sfRegex = /^SF:(.+)$/;

lines.forEach((line, index) => {
	const match = line.match(sfRegex);
	if (match) {
		sourceFiles.push({
			path: match[1],
			lineNumber: index + 1
		});
	}
});

console.log(`📊 Found ${sourceFiles.length} source files in coverage report\n`);

// Validation checks
let errors = 0;
let warnings = 0;

// Check 1: All paths should be relative and start with 'src/'
console.log('✓ Checking path format...');
sourceFiles.forEach(({ path: filePath, lineNumber }) => {
	if (filePath.startsWith('/') || filePath.startsWith('\\')) {
		console.error(`  ❌ Line ${lineNumber}: Absolute path detected: ${filePath}`);
		errors++;
	} else if (!filePath.startsWith('src/') && !filePath.startsWith('src\\')) {
		console.warn(`  ⚠️  Line ${lineNumber}: Path doesn't start with 'src/': ${filePath}`);
		warnings++;
	}
});

if (errors === 0 && warnings === 0) {
	console.log('  ✅ All paths are properly formatted\n');
} else {
	console.log('');
}

// Check 2: All source files should exist
console.log('✓ Checking if source files exist...');
const missingFiles = [];
sourceFiles.forEach(({ path: filePath }) => {
	const fullPath = path.join(projectRoot, filePath);
	if (!fs.existsSync(fullPath)) {
		missingFiles.push(filePath);
		console.error(`  ❌ File not found: ${filePath}`);
		errors++;
	}
});

if (missingFiles.length === 0) {
	console.log('  ✅ All source files exist\n');
} else {
	console.log('');
}

// Check 3: Validate LCOV format
console.log('✓ Checking LCOV format...');
const recordCount = (content.match(/^end_of_record$/gm) || []).length;
if (recordCount !== sourceFiles.length) {
	console.error(`  ❌ Mismatch: ${sourceFiles.length} SF entries but ${recordCount} end_of_record markers`);
	errors++;
} else {
	console.log(`  ✅ Valid LCOV format (${recordCount} records)\n`);
}

// Check 4: Verify coverage data exists
console.log('✓ Checking coverage data...');
const hasLineData = /^DA:\d+,\d+$/m.test(content);
const hasFunctionData = /^FNDA:\d+,.+$/m.test(content);
const hasBranchData = /^BRDA:\d+,\d+,\d+,\d+$/m.test(content);

if (!hasLineData) {
	console.warn('  ⚠️  No line coverage data found');
	warnings++;
}
if (!hasFunctionData) {
	console.warn('  ⚠️  No function coverage data found');
	warnings++;
}
if (!hasBranchData) {
	console.warn('  ⚠️  No branch coverage data found');
	warnings++;
}

if (hasLineData && hasFunctionData && hasBranchData) {
	console.log('  ✅ All coverage data types present\n');
} else {
	console.log('');
}

// Print summary
console.log('─'.repeat(50));
console.log('📋 Summary:');
console.log(`   Source files: ${sourceFiles.length}`);
console.log(`   Records: ${recordCount}`);
console.log(`   Errors: ${errors}`);
console.log(`   Warnings: ${warnings}`);
console.log('─'.repeat(50));

// Print first 5 source files as examples
console.log('\n📁 Sample source files:');
sourceFiles.slice(0, 5).forEach(({ path }) => {
	console.log(`   ${path}`);
});

if (sourceFiles.length > 5) {
	console.log(`   ... and ${sourceFiles.length - 5} more`);
}

// Exit with appropriate code
if (errors > 0) {
	console.log('\n❌ Validation failed! Please fix the errors above.\n');
	process.exit(1);
} else if (warnings > 0) {
	console.log('\n⚠️  Validation passed with warnings.\n');
	process.exit(0);
} else {
	console.log('\n✅ Validation successful! Coverage report is ready for Codecov.\n');
	process.exit(0);
}
