"""
Example: Undocumented exception
This demonstrates DSV301: EXCEPTION_UNDOCUMENTED
"""


def divide(a, b):
    """Divide two numbers.

    Args:
        a (float): Numerator
        b (float): Denominator

    Returns:
        float: Result of division
        # Missing: Raises section for ZeroDivisionError!
    """
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b


def safe_divide(a, b):
    """Divide two numbers safely.

    Args:
        a (float): Numerator
        b (float): Denominator

    Returns:
        float: Result of division

    Raises:
        ZeroDivisionError: If denominator is zero
        # This is properly documented!
    """
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b
