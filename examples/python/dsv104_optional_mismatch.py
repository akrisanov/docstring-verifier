"""
Examples demonstrating DSV104: Optional/required parameter mismatch detection.

This file shows cases where parameter optionality (has default value)
doesn't match between code signature and docstring.
"""


def correct_optional(name: str, age: int = 25) -> str:
    """Create greeting with optional age.

    Args:
        name (str): Person's name
        age (int, optional): Person's age

    Returns:
        str: Greeting message
    """
    return f"Hello {name}, age {age}"


def wrong_required_in_doc(name: str, age: int = 25) -> str:
    """DSV104: age has default value but marked as required in docstring.

    Args:
        name (str): Person's name
        age (int): Person's age (should be marked as 'optional')

    Returns:
        str: Greeting message
    """
    return f"Hello {name}, age {age}"


def wrong_optional_in_doc(name: str, age: int) -> str:
    """DSV104: age is required but marked as optional in docstring.

    Args:
        name (str): Person's name
        age (int, optional): Person's age (should NOT be marked as optional)

    Returns:
        str: Greeting message
    """
    return f"Hello {name}, age {age}"


def multiple_optional(first: str, second: str = "default", third: int = 0) -> str:
    """Correct: multiple optional parameters properly documented.

    Args:
        first (str): Required first parameter
        second (str, optional): Optional second parameter
        third (int, optional): Optional third parameter

    Returns:
        str: Combined result
    """
    return f"{first}-{second}-{third}"


def mixed_mismatch(a: str, b: int = 1, c: float = 2.0, d: str = "test") -> str:
    """DSV104: Multiple mismatches in optional/required status.

    Args:
        a (str): Required param (correct)
        b (int): Should be marked as optional ❌
        c (float, optional): Correct optional marking ✓
        d (str): Should be marked as optional ❌

    Returns:
        str: Result
    """
    return f"{a}{b}{c}{d}"


def no_optional_mention(name: str, age: int = 25) -> str:
    """No DSV104: docstring doesn't mention optionality at all.

    When docstring doesn't explicitly mark parameters as optional,
    we don't report a mismatch (avoids false positives).

    Args:
        name (str): Person's name
        age (int): Person's age (no mention of optional - OK)

    Returns:
        str: Greeting
    """
    return f"Hello {name}, age {age}"
