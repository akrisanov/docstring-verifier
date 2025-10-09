"""
Example file demonstrating DSV203: Docstring says returns, but function is void

This file shows functions that are void (no return type or return None)
but have Returns section in docstring.
"""


def print_message(message: str):
    """Print a message to console.

    Args:
        message: Message to print

    Returns:
        str: The printed message
    """
    # DSV203: Function is void but docstring documents a return ('str')
    print(message)


def save_to_file(filename: str, data: str) -> None:
    """Save data to file.

    Args:
        filename: Name of the file
        data: Data to save

    Returns:
        bool: True if successful, False otherwise
    """
    # DSV203: Function returns None but docstring documents a return ('bool')
    with open(filename, "w") as f:
        f.write(data)


def log_error(error: str) -> None:
    """Log error message.

    Args:
        error: Error message

    Returns:
        None: This function doesn't return anything
    """
    # DSV203: Function returns None and docstring documents return (even though it says 'None')
    print(f"ERROR: {error}")


def process_items(items: list):
    """Process list of items.

    Args:
        items: Items to process

    Returns:
        Processed results
    """
    # DSV203: Function is void but docstring has Returns section (no type specified)
    for item in items:
        print(item)


# CORRECT EXAMPLES - These should NOT trigger DSV203


def get_username() -> str:
    """Get current username.

    Returns:
        str: The username
    """
    return "admin"


def calculate_sum(a: int, b: int) -> int:
    """Calculate sum.

    Args:
        a: First number
        b: Second number

    Returns:
        int: The sum
    """
    return a + b


def print_hello():
    """Print hello message.

    This function has no return type and no Returns section.
    """
    print("Hello!")


def cleanup() -> None:
    """Clean up resources.

    This function returns None and has no Returns section.
    """
    print("Cleaning up...")


def maybe_get_value(key: str) -> str | None:
    """Get value if exists.

    Args:
        key: Key to lookup

    Returns:
        str | None: Value if found, None otherwise
    """
    # Not a void function - can return str or None
    return None
