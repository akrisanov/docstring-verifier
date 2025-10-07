/**
 * Describes a parameter documented in docstring.
 */
export interface DocstringParameterDescriptor {
    name: string;
    type: string | null;
    description: string;
}

/**
 * Describes return value documented in docstring.
 */
export interface DocstringReturnDescriptor {
    type: string | null;
    description: string;
}

/**
 * Describes an exception documented in docstring.
 */
export interface DocstringExceptionDescriptor {
    type: string;
    description: string;
}

/**
 * Describes complete information extracted from docstring.
 * This is the main output of docstring parsers (Google, Sphinx, JSDoc, etc.)
 */
export interface DocstringDescriptor {
    parameters: DocstringParameterDescriptor[];
    returns: DocstringReturnDescriptor | null;
    raises: DocstringExceptionDescriptor[];
    notes: string | null;
}
