"""
Example file demonstrating DSV205: Generator should use Yields, not Returns

This file shows generator functions that incorrectly use Returns section
instead of Yields section in their docstrings.
"""


def generate_numbers(n: int):
    """Generate numbers from 0 to n-1.

    Args:
        n: Number of values to generate

    Returns:
        Generator[int, None, None]: Number generator
    """
    # DSV205: Generator function should use Yields, not Returns
    for i in range(n):
        yield i


def read_lines(filename: str):
    """Read lines from file.

    Args:
        filename: File to read

    Returns:
        Iterator[str]: Lines from file
    """
    # DSV205: Generator function should use Yields, not Returns
    with open(filename) as f:
        for line in f:
            yield line.strip()


def fibonacci(n: int):
    """Generate Fibonacci sequence.

    Args:
        n: Number of values

    Returns:
        Sequence of Fibonacci numbers
    """
    # DSV205: Generator should use Yields (even without type specified)
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b


async def async_generator(items: list):
    """Process items asynchronously.

    Args:
        items: Items to process

    Returns:
        AsyncGenerator[str, None]: Processed items
    """
    # DSV205: Async generator should also use Yields
    import asyncio

    for item in items:
        await asyncio.sleep(0.01)  # Simulate async operation
        yield str(item)


def generator_with_return():
    """Generator with explicit return.

    Returns:
        Generator[int, None, str]: Values and final return
    """
    # DSV205: Even with return statement, it's still a generator
    yield 1
    yield 2
    return "done"


# CORRECT EXAMPLES - These should NOT trigger DSV205


def generate_values(n: int):
    """Generate values.

    Args:
        n: Count

    Yields:
        int: Generated values
    """
    # OK: Uses Yields section
    for i in range(n):
        yield i


def stream_data(source):
    """Stream data from source.

    Args:
        source: Data source

    Yields:
        Data items
    """
    # OK: Uses Yields section (no type)
    while True:
        data = source.read()
        if not data:
            break
        yield data


def regular_function(n: int) -> list:
    """Create list of numbers.

    Args:
        n: Count

    Returns:
        list: List of numbers
    """
    # OK: Not a generator, uses Returns
    return list(range(n))


def no_docstring_generator():
    """Generator without return documentation."""
    # OK: No Returns section to conflict with
    yield 1
    yield 2
