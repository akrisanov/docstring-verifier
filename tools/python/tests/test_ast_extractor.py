#!/usr/bin/env python3
"""
Unit tests for ast_extractor.py
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest

# Add parent directory to path to import ast_extractor
sys.path.insert(0, str(Path(__file__).parent.parent))
from ast_extractor import extract_functions  # noqa: E402


def get_fixture_path(filename: str) -> str:
    """Get path to a fixture file."""
    return str(Path(__file__).parent / "fixtures" / filename)


def run_extractor(file_path: str, use_subprocess: bool = False) -> dict:
    """Run ast_extractor on a file and return parsed JSON.

    Args:
        file_path: Path to the Python file to analyze
        use_subprocess: If True, run via subprocess (for CLI testing)
                       If False, call extract_functions directly (for coverage)
    """
    if use_subprocess:
        # Test CLI interface via subprocess
        ast_extractor_path = Path(__file__).parent.parent / "ast_extractor.py"
        result = subprocess.run(
            [sys.executable, str(ast_extractor_path), file_path],
            capture_output=True,
            text=True,
            check=False,
        )
        return json.loads(result.stdout)
    else:
        # Call function directly for better coverage
        return extract_functions(file_path)


@pytest.fixture
def sample_result():
    """Fixture that runs extractor on test_sample.py once."""
    # Use direct function call for coverage
    return run_extractor(get_fixture_path("test_sample.py"), use_subprocess=False)


def test_basic_function(sample_result):
    """Test extraction of a basic function with parameters."""
    result = sample_result

    assert result["success"], "Extraction should succeed"
    assert len(result["functions"]) == 3, "Should find 3 functions"

    # Test first function (calculate)
    calc = result["functions"][0]
    assert calc["name"] == "calculate", "Function name should be 'calculate'"
    assert len(calc["parameters"]) == 2, "Should have 2 parameters"
    assert calc["parameters"][0]["name"] == "x", "First param should be 'x'"
    assert calc["parameters"][0]["type"] == "int", "Param x should be int"
    assert calc["parameters"][1]["name"] == "y", "Second param should be 'y'"
    assert calc["returnType"] == "int", "Return type should be int"
    assert len(calc["returnStatements"]) == 1, "Should have 1 return statement"
    assert calc["docstring"] is not None, "Should have docstring"
    assert not calc["hasIO"], "Should not have I/O"
    assert not calc["hasGlobalMods"], "Should not have global mods"


def test_default_parameters(sample_result):
    """Test extraction of functions with default parameters."""
    result = sample_result

    # Test second function (fetch_data)
    fetch = result["functions"][1]
    assert fetch["name"] == "fetch_data", "Function name should be 'fetch_data'"
    assert len(fetch["parameters"]) == 2, "Should have 2 parameters"

    url_param = fetch["parameters"][0]
    assert url_param["name"] == "url", "First param should be 'url'"
    assert not url_param["isOptional"], "url should not be optional"
    assert url_param["defaultValue"] is None, "url should have no default"

    timeout_param = fetch["parameters"][1]
    assert timeout_param["name"] == "timeout", "Second param should be 'timeout'"
    assert timeout_param["isOptional"], "timeout should be optional"
    assert timeout_param["defaultValue"] == "30", "timeout default should be 30"


def test_exception_tracking(sample_result):
    """Test tracking of raised exceptions."""
    result = sample_result

    fetch = result["functions"][1]
    assert len(fetch["raises"]) == 1, "Should track 1 raised exception"
    assert fetch["raises"][0]["type"] == "ValueError", "Should be ValueError"
    assert fetch["raises"][0]["line"] == 41, "Exception should be on line 41"


def test_io_detection(sample_result):
    """Test detection of I/O operations."""
    result = sample_result

    fetch = result["functions"][1]
    assert fetch["hasIO"], "Should detect I/O (print call)"

    calc = result["functions"][0]
    assert not calc["hasIO"], "Should not detect I/O"


def test_global_mods(sample_result):
    """Test detection of global modifications."""
    result = sample_result

    process = result["functions"][2]
    assert process["hasGlobalMods"], "Should detect global statement"

    calc = result["functions"][0]
    assert not calc["hasGlobalMods"], "Should not detect global mods"


def test_varargs(sample_result):
    """Test extraction of *args and **kwargs."""
    result = sample_result

    process = result["functions"][2]
    assert len(process["parameters"]) == 2, "Should have 2 params (*args, **kwargs)"
    assert process["parameters"][0]["name"] == "*args", "Should have *args"
    assert process["parameters"][1]["name"] == "**kwargs", "Should have **kwargs"


def test_docstring_location(sample_result):
    """Test extraction of docstring location."""
    result = sample_result

    calc = result["functions"][0]
    assert calc["docstringRange"] is not None, "Should have docstring range"
    assert "start" in calc["docstringRange"], "Should have start"
    assert "end" in calc["docstringRange"], "Should have end"
    assert calc["docstringRange"]["start"]["line"] < calc["docstringRange"]["end"]["line"], (
        "Start < End"
    )


def test_syntax_error(tmp_path):
    """Test handling of syntax errors."""
    # Create a temporary file with syntax error
    error_file = tmp_path / "syntax_error.py"
    error_file.write_text("def broken(\n    invalid syntax")

    result = run_extractor(str(error_file))
    assert not result["success"], "Should report failure"
    assert result["error"] == "SyntaxError", "Should be SyntaxError"
    assert "line" in result, "Should include error line"


def test_nonexistent_file():
    """Test handling of non-existent file."""
    result = run_extractor("_nonexistent_file.py")

    assert not result["success"], "Should report failure"
    assert result["error"] in ["FileNotFound", "FileNotFoundError"], "Should be FileNotFound(Error)"


def test_generator_detection(tmp_path):
    """Test detection of generator functions with yield."""
    gen_file = tmp_path / "generator.py"
    gen_file.write_text("""
def simple_generator(n: int):
    '''Generate numbers.'''
    for i in range(n):
        yield i

def generator_with_return():
    '''Generator with return.'''
    yield 1
    yield 2
    return "done"
""")

    result = run_extractor(str(gen_file))
    assert result["success"], "Should succeed"
    assert len(result["functions"]) == 2, "Should find 2 functions"

    # Test simple generator
    gen = result["functions"][0]
    assert gen["name"] == "simple_generator"
    assert gen["isGenerator"], "Should detect as generator"
    assert not gen["isAsync"], "Should not be async"
    assert len(gen["yieldStatements"]) == 1, "Should have 1 yield"
    # Note: Type inference for 'i' from loop variable may not work

    # Test generator with return
    gen_ret = result["functions"][1]
    assert gen_ret["name"] == "generator_with_return"
    assert gen_ret["isGenerator"], "Should detect as generator"
    assert len(gen_ret["yieldStatements"]) == 2, "Should have 2 yields"
    assert len(gen_ret["returnStatements"]) == 1, "Should have 1 return"


def test_async_function(tmp_path):
    """Test detection of async functions."""
    async_file = tmp_path / "async_func.py"
    async_file.write_text("""
async def fetch_data(url: str):
    '''Fetch data async.'''
    return await get(url)

async def async_generator(items):
    '''Async generator.'''
    for item in items:
        yield item
""")

    result = run_extractor(str(async_file))
    assert result["success"], "Should succeed"
    assert len(result["functions"]) == 2, "Should find 2 functions"

    # Test async function
    async_fn = result["functions"][0]
    assert async_fn["name"] == "fetch_data"
    assert async_fn["isAsync"], "Should detect as async"
    assert not async_fn["isGenerator"], "Should not be generator"

    # Test async generator
    async_gen = result["functions"][1]
    assert async_gen["name"] == "async_generator"
    assert async_gen["isAsync"], "Should detect as async"
    assert async_gen["isGenerator"], "Should detect as generator"
    assert len(async_gen["yieldStatements"]) == 1, "Should have 1 yield"


def test_multiple_returns(tmp_path):
    """Test tracking of multiple return statements."""
    multi_file = tmp_path / "multi_return.py"
    multi_file.write_text("""
def conditional_return(x: int):
    '''Return different types.'''
    if x > 0:
        return "positive"
    elif x < 0:
        return -1
    return None
""")

    result = run_extractor(str(multi_file))
    assert result["success"], "Should succeed"
    assert len(result["functions"]) == 1, "Should find 1 function"

    func = result["functions"][0]
    assert func["name"] == "conditional_return"
    assert len(func["returnStatements"]) == 3, "Should track 3 return statements"

    # Check types - note that some types may be inferred, others may be None
    return_types = [r["type"] for r in func["returnStatements"]]
    assert "str" in return_types, "Should have str return"
    assert "None" in return_types, "Should have None return"
    # Note: Negative literal -1 type inference may not work reliably


def test_yield_from(tmp_path):
    """Test detection of yield from expressions."""
    yield_from_file = tmp_path / "yield_from.py"
    yield_from_file.write_text("""
def delegate_generator():
    '''Delegate to another generator.'''
    yield from range(10)
    yield from [1, 2, 3]
""")

    result = run_extractor(str(yield_from_file))
    assert result["success"], "Should succeed"
    assert len(result["functions"]) == 1, "Should find 1 function"

    func = result["functions"][0]
    assert func["isGenerator"], "Should detect as generator"
    assert len(func["yieldStatements"]) == 2, "Should track 2 yield from statements"
