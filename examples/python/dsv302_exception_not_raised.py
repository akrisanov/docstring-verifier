"""
DSV302: Exception documented but not raised

This file demonstrates cases where exceptions are documented in the docstring
but are not actually raised in the code.
"""


def process_data(data):
    """Process some data.

    Args:
        data (dict): Input data

    Returns:
        dict: Processed data

    Raises:
        ValueError: If data is invalid
        TypeError: If data is wrong type
        # ISSUE: Neither ValueError nor TypeError are actually raised!
    """
    # Just return the data without validation
    return data


def safe_process(data):
    """Process data with proper validation.

    This function is properly documented - all raised exceptions are listed.
    This should NOT trigger any warnings.

    Args:
        data (dict): Input data

    Returns:
        dict: Processed data

    Raises:
        ValueError: If data is invalid
        TypeError: If data is not a dict
    """
    if not isinstance(data, dict):
        raise TypeError("Data must be a dictionary")

    if not data:
        raise ValueError("Data cannot be empty")

    return data


def mixed_exceptions(value):
    """Function with mixed exception documentation.

    Args:
        value (int): Input value

    Returns:
        int: Processed value

    Raises:
        ValueError: If value is negative  # ← Actually raised
        TypeError: If value is wrong type  # ← NOT raised (DSV302)
        KeyError: If value not found       # ← NOT raised (DSV302)
    """
    if value < 0:
        raise ValueError("Value must be non-negative")

    return value * 2
