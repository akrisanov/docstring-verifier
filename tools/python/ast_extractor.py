#!/usr/bin/env python3
"""
Python AST Extractor for Docstring Verifier VS Code Extension.

This script analyzes Python source files using the ast module and extracts:
- Function signatures (name, parameters, types, defaults)
- Return type hints and return statements
- Raised exceptions
- Docstrings and their locations

Output is JSON to stdout for consumption by the TypeScript extension.
"""

import ast
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional


def to_camel_case(snake_str: str) -> str:
    """Convert snake_case to camelCase."""
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def dataclass_to_dict(obj: Any) -> dict[str, Any]:
    """Convert dataclass to dict with camelCase keys."""
    if not hasattr(obj, "__dataclass_fields__"):
        return obj

    result = {}
    for key, value in asdict(obj).items():
        camel_key = to_camel_case(key)
        if isinstance(value, list):
            result[camel_key] = [dataclass_to_dict(item) for item in value]
        else:
            result[camel_key] = value
    return result


@dataclass
class ParameterDescriptor:
    """Information about a function parameter.

    Note: Snake_case field names are converted to camelCase in JSON output.
    """

    name: str
    type: Optional[str]
    default_value: Optional[str]
    is_optional: bool


@dataclass
class ReturnDescriptor:
    """Information about a return statement."""

    type: Optional[str]
    line: int


@dataclass
class ExceptionDescriptor:
    """Information about a raised exception."""

    type: str
    line: int


@dataclass
class FunctionDescriptor:
    """Complete information about a function.

    Note: This structure is converted to match TypeScript's FunctionDescriptor
    interface with vscode.Range format in JSON output.
    """

    name: str
    line_start: int
    line_end: int
    col_start: int
    col_end: int
    parameters: list[ParameterDescriptor]
    return_type: Optional[str]
    return_statements: list[ReturnDescriptor]
    raises: list[ExceptionDescriptor]
    docstring: Optional[str]
    docstring_line_start: Optional[int]
    docstring_line_end: Optional[int]
    has_io: bool
    has_global_mods: bool

    def to_dict(self) -> dict[str, Any]:
        """Convert to dict with TypeScript-compatible structure."""
        # Convert range to VS Code Range format: {start: {line, character}, end: {line, character}}
        # Note: VS Code uses 0-based indexing
        range_dict = {
            "start": {"line": self.line_start - 1, "character": self.col_start},
            "end": {"line": self.line_end - 1, "character": self.col_end},
        }

        # Convert docstring range if present
        docstring_range = None
        if self.docstring_line_start is not None and self.docstring_line_end is not None:
            docstring_range = {
                "start": {"line": self.docstring_line_start - 1, "character": 0},
                "end": {"line": self.docstring_line_end - 1, "character": 0},
            }

        return {
            "name": self.name,
            "range": range_dict,
            "parameters": [dataclass_to_dict(p) for p in self.parameters],
            "returnType": self.return_type,
            "returnStatements": [dataclass_to_dict(r) for r in self.return_statements],
            "raises": [dataclass_to_dict(e) for e in self.raises],
            "docstring": self.docstring,
            "docstringRange": docstring_range,
            "hasIO": self.has_io,
            "hasGlobalMods": self.has_global_mods,
        }


class ASTExtractor(ast.NodeVisitor):
    """Extract function information from Python AST."""

    def __init__(self, source: str):
        self.source = source
        self.source_lines = source.splitlines()
        self.functions: list[FunctionDescriptor] = []
        self.current_function: Optional[ast.FunctionDef] = None
        self.return_statements: list[ReturnDescriptor] = []
        self.exceptions: list[ExceptionDescriptor] = []
        self.has_io = False
        self.has_global_mods = False

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Visit a function definition."""
        # Save previous function context
        prev_function = self.current_function
        prev_returns = self.return_statements
        prev_exceptions = self.exceptions
        prev_has_io = self.has_io
        prev_has_global_mods = self.has_global_mods

        # Reset for current function
        self.current_function = node
        self.return_statements = []
        self.exceptions = []
        self.has_io = False
        self.has_global_mods = False

        # Extract parameters
        parameters = self._extract_parameters(node)

        # Extract return type
        return_type = self._extract_return_type(node)

        # Extract docstring
        docstring, doc_start, doc_end = self._extract_docstring(node)

        # Visit function body to find returns and raises
        for child in node.body:
            self.visit(child)

        # Create function info
        func_info = FunctionDescriptor(
            name=node.name,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            col_start=node.col_offset,
            col_end=node.end_col_offset or node.col_offset,
            parameters=parameters,
            return_type=return_type,
            return_statements=self.return_statements,
            raises=self.exceptions,
            docstring=docstring,
            docstring_line_start=doc_start,
            docstring_line_end=doc_end,
            has_io=self.has_io,
            has_global_mods=self.has_global_mods,
        )
        self.functions.append(func_info)

        # Restore previous context (for nested functions)
        self.current_function = prev_function
        self.return_statements = prev_returns
        self.exceptions = prev_exceptions
        self.has_io = prev_has_io
        self.has_global_mods = prev_has_global_mods

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Visit an async function definition (same as regular function)."""
        self.visit_FunctionDef(node)  # type: ignore

    def visit_Return(self, node: ast.Return) -> None:
        """Visit a return statement."""
        if self.current_function is not None:
            return_type = self._infer_type(node.value) if node.value else "None"
            self.return_statements.append(ReturnDescriptor(type=return_type, line=node.lineno))
        self.generic_visit(node)

    def visit_Raise(self, node: ast.Raise) -> None:
        """Visit a raise statement."""
        if self.current_function is not None and node.exc:
            exc_type = self._extract_exception_type(node.exc)
            if exc_type:
                self.exceptions.append(ExceptionDescriptor(type=exc_type, line=node.lineno))
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        """Visit a function call to detect I/O operations."""
        if self.current_function is not None:
            func_name = self._get_call_name(node)

            # Check for I/O operations
            io_functions = {"open", "read", "write", "print", "input"}
            if func_name in io_functions:
                self.has_io = True

            # Check for file operations
            if isinstance(node.func, ast.Attribute) and node.func.attr in {
                "read",
                "write",
                "close",
                "readline",
                "readlines",
                "writelines",
            }:
                self.has_io = True

        self.generic_visit(node)

    def visit_Global(self, node: ast.Global) -> None:
        """Visit a global statement."""
        if self.current_function is not None:
            self.has_global_mods = True
        self.generic_visit(node)

    def visit_Nonlocal(self, node: ast.Nonlocal) -> None:
        """Visit a nonlocal statement."""
        if self.current_function is not None:
            self.has_global_mods = True
        self.generic_visit(node)

    def _extract_parameters(self, node: ast.FunctionDef) -> list[ParameterDescriptor]:
        """Extract parameter information from function arguments."""
        parameters: list[ParameterDescriptor] = []
        args = node.args

        # Regular args
        defaults_offset = len(args.args) - len(args.defaults)
        for i, arg in enumerate(args.args):
            if arg.arg == "self" or arg.arg == "cls":
                continue

            default_idx = i - defaults_offset
            default_value = None
            is_optional = False

            if default_idx >= 0:
                default_value = self._ast_to_string(args.defaults[default_idx])
                is_optional = True

            param_type = self._extract_annotation(arg.annotation)

            parameters.append(
                ParameterDescriptor(
                    name=arg.arg,
                    type=param_type,
                    default_value=default_value,
                    is_optional=is_optional,
                )
            )

        # *args
        if args.vararg:
            parameters.append(
                ParameterDescriptor(
                    name=f"*{args.vararg.arg}",
                    type=self._extract_annotation(args.vararg.annotation),
                    default_value=None,
                    is_optional=True,
                )
            )

        # Keyword-only args
        kw_defaults_map = {
            kw.arg: default
            for kw, default in zip(args.kwonlyargs, args.kw_defaults)
            if default is not None
        }

        for kwarg in args.kwonlyargs:
            default_value = None
            is_optional = False

            if kwarg.arg in kw_defaults_map:
                default_value = self._ast_to_string(kw_defaults_map[kwarg.arg])
                is_optional = True

            parameters.append(
                ParameterDescriptor(
                    name=kwarg.arg,
                    type=self._extract_annotation(kwarg.annotation),
                    default_value=default_value,
                    is_optional=is_optional,
                )
            )

        # **kwargs
        if args.kwarg:
            parameters.append(
                ParameterDescriptor(
                    name=f"**{args.kwarg.arg}",
                    type=self._extract_annotation(args.kwarg.annotation),
                    default_value=None,
                    is_optional=True,
                )
            )

        return parameters

    def _extract_return_type(self, node: ast.FunctionDef) -> Optional[str]:
        """Extract return type annotation from function."""
        if node.returns:
            return self._extract_annotation(node.returns)
        return None

    def _extract_annotation(self, annotation: Optional[ast.expr]) -> Optional[str]:
        """Convert type annotation AST node to string."""
        if annotation is None:
            return None
        return self._ast_to_string(annotation)

    def _extract_docstring(
        self, node: ast.FunctionDef
    ) -> tuple[Optional[str], Optional[int], Optional[int]]:
        """Extract docstring and its location from function."""
        docstring = ast.get_docstring(node)
        if not docstring:
            return None, None, None

        # Find docstring node
        if (
            node.body
            and isinstance(node.body[0], ast.Expr)
            and isinstance(node.body[0].value, ast.Constant)
        ):
            doc_node = node.body[0]
            return (
                docstring,
                doc_node.lineno,
                doc_node.end_lineno or doc_node.lineno,
            )

        return docstring, None, None

    def _extract_exception_type(self, exc: ast.expr) -> Optional[str]:
        """Extract exception type from raise statement."""
        if isinstance(exc, ast.Name):
            return exc.id
        elif isinstance(exc, ast.Call):
            return self._ast_to_string(exc.func)
        return self._ast_to_string(exc)

    def _infer_type(self, node: Optional[ast.expr]) -> Optional[str]:
        """Infer type from AST node (basic heuristic)."""
        if node is None:
            return "None"

        if isinstance(node, ast.Constant):
            if node.value is None:
                return "None"
            return type(node.value).__name__

        if isinstance(node, ast.Name):
            return None  # Cannot infer from variable name

        if isinstance(node, ast.List):
            return "list"
        elif isinstance(node, ast.Dict):
            return "dict"
        elif isinstance(node, ast.Set):
            return "set"
        elif isinstance(node, ast.Tuple):
            return "tuple"

        return None

    def _get_call_name(self, node: ast.Call) -> Optional[str]:
        """Get the name of a called function."""
        if isinstance(node.func, ast.Name):
            return node.func.id
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr
        return None

    def _ast_to_string(self, node: ast.expr) -> str:
        """Convert AST node to string representation."""
        return ast.unparse(node)


def extract_functions(file_path: str) -> dict[str, Any]:
    """
    Extract function information from a Python file.

    Args:
        file_path: Path to the Python file to analyze

    Returns:
        Dictionary with extracted function information or error details
    """
    try:
        # Read the file
        source = Path(file_path).read_text(encoding="utf-8")

        # Parse AST
        tree = ast.parse(source, filename=file_path)

        # Extract functions
        extractor = ASTExtractor(source)
        extractor.visit(tree)

        # Convert to JSON-serializable format with TypeScript-compatible structure
        functions = [func.to_dict() for func in extractor.functions]

        return {
            "success": True,
            "file": file_path,
            "functions": functions,
        }

    except SyntaxError as e:
        return {
            "success": False,
            "error": "SyntaxError",
            "message": str(e),
            "line": e.lineno,
            "offset": e.offset,
        }
    except Exception as e:
        return {
            "success": False,
            "error": type(e).__name__,
            "message": str(e),
        }


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "InvalidArguments",
                    "message": "Usage: ast_extractor.py <file_path>",
                }
            )
        )
        sys.exit(1)

    file_path = sys.argv[1]

    if not Path(file_path).exists():
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "FileNotFound",
                    "message": f"File not found: {file_path}",
                }
            )
        )
        sys.exit(1)

    result = extract_functions(file_path)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
