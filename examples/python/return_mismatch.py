"""
Example: Return type mismatch
This demonstrates DSV201: RETURN_TYPE_MISMATCH
"""


def get_user_data(user_id):
    """Fetch user data from database.

    Args:
        user_id (int): User identifier

    Returns:
        dict: User information
        # But the actual return is a list!
    """
    return [{"id": user_id, "name": "John"}]


def calculate_average(numbers):
    """Calculate average of numbers.

    Args:
        numbers (list): List of numbers

    Returns:
        float: Average value
        # This is correct!
    """
    return sum(numbers) / len(numbers)
