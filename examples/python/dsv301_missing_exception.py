"""
DSV301: Exception raised but not documented

This file demonstrates cases where exceptions are raised in the code
but are not documented in the docstring's Raises section.
"""


def divide(a, b):
    """Divide two numbers.

    Args:
        a (float): Numerator
        b (float): Denominator

    Returns:
        float: Result of division
        # ISSUE: Missing Raises section for ZeroDivisionError!
    """
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b


def safe_divide(a, b):
    """Divide two numbers safely.

    This function is properly documented - exception is listed.
    This should NOT trigger any warnings.

    Args:
        a (float): Numerator
        b (float): Denominator

    Returns:
        float: Result of division

    Raises:
        ZeroDivisionError: If denominator is zero
    """
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b
