"""
Test sample for AST extractor.

This file contains various function patterns used to test
the Python AST extractor's ability to parse:
- Function signatures with type hints
- Docstrings with Args/Returns/Raises sections
- Default parameters
- Variable arguments (*args, **kwargs)
- Global variable modifications
"""


def calculate(x: int, y: int) -> int:
    """Calculate result.

    Args:
        y (int): Second number

    Returns:
        int: The result
    """
    return x + y


def fetch_data(url: str, timeout: int = 30) -> dict:
    """Fetch data from URL.

    Args:
        url (str): The URL to fetch
        timeout (int): Timeout in seconds

    Returns:
        dict: The fetched data

    Raises:
        ValueError: If URL is invalid
        TimeoutError: If request times out
    """
    if not url:
        raise ValueError("URL cannot be empty")

    # Simulate I/O
    print(f"Fetching {url}")

    return {"status": "ok"}


def process_items(*args, **kwargs):
    """Process items with variable arguments."""
    global COUNTER
    COUNTER += 1
    return list(args)
