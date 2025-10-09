"""
DSV201: Return type mismatch

This file demonstrates cases where the return type in the docstring
does not match the actual return type in the code.
"""


def get_user_data(user_id: int) -> list:
    """Fetch user data from database.

    Args:
        user_id (int): User identifier

    Returns:
        dict: User information  # ISSUE: Code returns list, docstring says dict!
    """
    return [{"id": user_id, "name": "John"}]


def calculate_average(numbers: list) -> float:
    """Calculate average of numbers.

    This function is properly documented - return type is correct.
    This should NOT trigger any warnings.

    Args:
        numbers (list): List of numbers

    Returns:
        float: Average value
    """
    return sum(numbers) / len(numbers)
