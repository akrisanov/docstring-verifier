"""
Example file demonstrating DSV204: Multiple inconsistent return types

This file shows functions that have multiple return statements with different types.
"""

# Mock data storage
storage = {"name": "John", "email": "john@example.com"}


def get_value(key: str, default=None):
    """Get value from storage.

    Args:
        key: The key to lookup
        default: Default value if not found

    Returns:
        str | None: The value
    """
    # DSV204: Function returns str, None, and int (inconsistent types)
    if key == "count":
        return 42  # int
    if key in storage:
        return storage[key]  # str
    return None  # None


def process_data(data: dict) -> str | int:
    """Process data and return result.

    Args:
        data: Data to process

    Returns:
        str | int: Result
    """
    # DSV204: Returns str, int, bool, None (more types than documented)
    if not data:
        return None  # None - not in union type!

    if "name" in data:
        return data["name"]  # str

    if "count" in data:
        return data["count"]  # int

    return False  # bool - not in union type!


def calculate_result(values: list) -> float:
    """Calculate result from values.

    Args:
        values: List of values

    Returns:
        float: Calculated result
    """
    # DSV204: Returns float, int, str (inconsistent with documented float)
    if not values:
        return 0  # int

    if len(values) == 1:
        return values[0]  # Could be anything

    total = sum(values)
    if total > 100:
        return "overflow"  # str - definitely not float!

    return total / len(values)  # float


# CORRECT EXAMPLES - These should NOT trigger DSV204

# Mock user database
users = {1: "Alice", 2: "Bob", 3: "Charlie"}


def get_name(user_id: int) -> str | None:
    """Get user name.

    Args:
        user_id: User ID

    Returns:
        str | None: Name if found, None otherwise
    """
    # OK: All returns match documented str | None
    if user_id in users:
        return users[user_id]  # str
    return None  # None


def calculate_sum(numbers: list) -> int:
    """Calculate sum.

    Args:
        numbers: Numbers to sum

    Returns:
        int: Sum of numbers
    """
    # OK: All returns are int
    if not numbers:
        return 0

    result = 0
    for num in numbers:
        result += num

    return result


def check_value(value: int) -> bool:
    """Check if value is valid.

    Args:
        value: Value to check

    Returns:
        bool: True if valid, False otherwise
    """
    # OK: All returns are bool
    if value < 0:
        return False

    if value > 100:
        return False

    return True
