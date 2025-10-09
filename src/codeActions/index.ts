/**
 * Code Actions module.
 * Provides Quick Fixes for docstring diagnostics.
 */

export { DocstringCodeActionProvider, registerCodeActionProvider } from './provider';
export { ParameterFixProvider } from './fixes/parameterFixes';
export type { ICodeActionProvider, CodeActionContext, CodeActionProviderMetadata } from './types';
