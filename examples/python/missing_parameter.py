"""
Example: Missing parameter in docstring
This demonstrates DSV102: PARAM_MISSING_IN_DOCSTRING
"""


def add_numbers(x, y):
    """Add two numbers.

    Args:
        y (int): Second number
        # Missing: x parameter is not documented!

    Returns:
        int: Sum of the numbers
    """
    result = x + y
    return result


def subtract(a, b):
    """Subtract two numbers.

    This function is properly documented - all parameters are listed.

    Args:
        a (int): First number
        b (int): Second number

    Returns:
        int: Difference
    """
    return a - b
