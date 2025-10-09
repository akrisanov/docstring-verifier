"""
Examples of Python functions with Sphinx-style docstrings.

This file demonstrates various Sphinx docstring formats and validation rules.
"""


def add_numbers(x, y):
    """Add two numbers.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int
    :returns: Sum of the numbers
    :rtype: int
    """
    return x + y


def greet(name, greeting="Hello"):
    """Greet a person.

    :param name: Name of the person
    :type name: str
    :param greeting: Greeting message
    :type greeting: str, optional
    :returns: Formatted greeting
    :rtype: str
    """
    return f"{greeting}, {name}!"


def process_data(data):
    """Process input data.

    This function processes the input data and returns a result.
    It may raise exceptions if the data is invalid.

    :param data: Input data to process
    :type data: dict
    :returns: Processed result
    :rtype: dict
    :raises ValueError: If data is empty or invalid
    :raises KeyError: If required key is missing
    :note: This function modifies the input data in-place
    """
    if not data:
        raise ValueError("Data cannot be empty")

    if "required_key" not in data:
        raise KeyError("Missing required_key")

    data["processed"] = True
    return data


def divide(a, b):
    """Divide two numbers.

    :param a: Numerator
    :type a: float
    :param b: Denominator
    :type b: float
    :returns: Result of division
    :rtype: float
    :raises ZeroDivisionError: If b is zero
    """
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b


def get_user_info(user_id, include_details=False):
    """Retrieve user information.

    :param user_id: ID of the user
    :type user_id: int
    :param include_details: Whether to include detailed information
    :type include_details: bool, optional
    :returns: User information dictionary or None if not found
    :rtype: dict or None
    """
    # Simulated function
    return {"id": user_id, "name": "User"}


def generate_numbers(start, end):
    """Generate numbers in a range.

    :param start: Starting number
    :type start: int
    :param end: Ending number (exclusive)
    :type end: int
    :yields: Numbers in the range
    :ytype: int
    """
    for i in range(start, end):
        yield i


def complex_function(x, y, z=None, *args, **kwargs):
    """Complex function with various parameter types.

    :param x: First parameter
    :type x: int
    :param y: Second parameter
    :type y: str
    :param z: Optional third parameter
    :type z: optional float
    :param args: Variable positional arguments
    :param kwargs: Variable keyword arguments
    :returns: Processed result
    :rtype: dict
    """
    result = {"x": x, "y": y, "z": z}
    return result


def no_docstring_function(a, b):
    return a + b


def minimal_docstring(x):
    """A minimal docstring without any Sphinx directives."""
    return x * 2
