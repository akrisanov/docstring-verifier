"""
DSV101: Parameter in docstring but not in code

This file demonstrates cases where parameters are documented in the docstring
but are not present in the actual function signature.
"""


def calculate_area(width: float) -> float:
    """Calculate the area of a rectangle.

    Args:
        width (float): The width of the rectangle
        height (float): The height of the rectangle  # ISSUE: Not in signature!
        depth (float): The depth  # ISSUE: Not in signature!

    Returns:
        float: The calculated area
    """
    return width * 10.0  # Using hardcoded value instead of missing params


def greet_user(name: str) -> str:
    """Greet a user by name.

    Args:
        name (str): The user's name
        title (str): The user's title (Mr., Mrs., etc.)  # ISSUE: Not in signature!

    Returns:
        str: A greeting message
    """
    return f"Hello, {name}!"


def valid_function(x: int, y: int) -> int:
    """A properly documented function.

    This function is correctly documented - all parameters match.
    This should NOT trigger any warnings.

    Args:
        x (int): First number
        y (int): Second number

    Returns:
        int: Sum of x and y
    """
    return x + y
