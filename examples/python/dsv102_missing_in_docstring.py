"""
DSV102: Parameter in code but missing in docstring

This file demonstrates cases where parameters are present in the function signature
but are not documented in the docstring.
"""


def add_numbers(x, y):
    """Add two numbers.

    Args:
        y (int): Second number
        # ISSUE: Parameter 'x' is not documented!

    Returns:
        int: Sum of the numbers
    """
    result = x + y
    return result


def subtract(a, b):
    """Subtract two numbers.

    This function is properly documented - all parameters are listed.
    This should NOT trigger any warnings.

    Args:
        a (int): First number
        b (int): Second number

    Returns:
        int: Difference
    """
    return a - b
