"""
DSV103: Parameter type mismatch

This file demonstrates cases where the parameter type in the code
does not match the type documented in the docstring.
"""


def process_data(name: str, age: int, score: float) -> None:
    """Process user data.

    Args:
        name (string): User's name  # ISSUE: 'string' should be 'str'
        age (str): User's age  # ISSUE: Should be 'int', not 'str'
        score (float): User's score  # OK: Matches code

    Returns:
        None
    """
    print(f"{name} is {age} years old with score {score}")


def calculate(x: int, y: int) -> int:
    """Add two numbers.

    Args:
        x (integer): First number  # ISSUE: 'integer' should be 'int'
        y (int): Second number  # OK: Matches code

    Returns:
        int: Sum of x and y
    """
    return x + y


def fetch_config(path: str, timeout: int = 30) -> dict:
    """Fetch configuration from file.

    Args:
        path (str): Path to config file  # OK: Matches code
        timeout (int): Timeout in seconds  # OK: Matches code

    Returns:
        dict: Configuration dictionary
    """
    return {"path": path, "timeout": timeout}


def validate_user(username: str, is_admin: bool) -> bool:
    """Validate user credentials.

    Args:
        username (str): Username to validate  # OK: Matches code
        is_admin (boolean): Whether user is admin  # ISSUE: 'boolean' should be 'bool'

    Returns:
        bool: True if valid, False otherwise
    """
    return len(username) > 0 and is_admin


def get_items(count: int | None = None) -> list:
    """Get list of items.

    Args:
        count (Optional[int]): Number of items  # OK: Optional[int] normalizes to int|none

    Returns:
        list: List of items
    """
    if count is None:
        count = 10
    return list(range(count))
