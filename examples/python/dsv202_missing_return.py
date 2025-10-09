"""
Example file demonstrating DSV202: Missing return in docstring

This file shows functions that have return types in code
but are not documented in the docstring.
"""


def get_user_name(user_id: int) -> str:
    """Get user name by ID.

    Args:
        user_id: The user ID to lookup
    """
    # DSV202: Function returns 'str' but return is not documented in docstring
    return f"User_{user_id}"


def calculate_sum(a: int, b: int) -> int:
    """Calculate sum of two numbers.

    Args:
        a: First number
        b: Second number
    """
    # DSV202: Function returns 'int' but return is not documented in docstring
    return a + b


def get_user_data(user_id: int) -> dict:
    """Fetch user data from database.

    Args:
        user_id: The user ID to fetch
    """
    # DSV202: Function returns 'dict' but return is not documented in docstring
    return {"id": user_id, "name": "John"}


def process_data(data: list) -> list[str]:
    """Process input data.

    Args:
        data: Input data to process
    """
    # DSV202: Function returns 'list[str]' but return is not documented in docstring
    return [str(item) for item in data]


# CORRECT EXAMPLES - These should NOT trigger DSV202


def print_hello() -> None:
    """Print hello message.

    This is a void function, no return documentation needed.
    """
    print("Hello!")


def save_file(filename: str):
    """Save file to disk.

    Args:
        filename: Name of the file to save

    No return type hint, so no return documentation needed.
    """
    with open(filename, "w") as f:
        f.write("data")


def get_config() -> dict:
    """Get configuration settings.

    Returns:
        dict: Configuration dictionary with settings
    """
    return {"debug": True, "verbose": False}


def fetch_users() -> list:
    """Fetch all users from database.

    Returns:
        list: List of user objects
    """
    return [{"id": 1}, {"id": 2}]
