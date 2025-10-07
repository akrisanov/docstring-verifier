#!/usr/bin/env python3
"""
Unit tests for ast_extractor.py
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest


def get_fixture_path(filename: str) -> str:
    """Get path to a fixture file."""
    return str(Path(__file__).parent / "fixtures" / filename)


def run_extractor(file_path: str) -> dict:
    """Run ast_extractor on a file and return parsed JSON."""
    # Get path to ast_extractor.py (one level up from tests/)
    ast_extractor_path = Path(__file__).parent.parent / "ast_extractor.py"

    result = subprocess.run(
        [sys.executable, str(ast_extractor_path), file_path],
        capture_output=True,
        text=True,
        check=False,
    )
    return json.loads(result.stdout)


@pytest.fixture
def sample_result():
    """Fixture that runs extractor on test_sample.py once."""
    return run_extractor(get_fixture_path("test_sample.py"))


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
    assert fetch["raises"][0]["line"] == 31, "Exception should be on line 31"


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
    assert result["error"] == "FileNotFound", "Should be FileNotFound"
