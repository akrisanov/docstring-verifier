"""
Test file to demonstrate Sphinx-style docstring validation.
Open this file in VS Code with the extension running to see diagnostics.
"""


def correct_function(x, y):
    """Add two numbers correctly documented.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int
    :returns: Sum of the numbers
    :rtype: int
    """
    return x + y


def missing_param_in_docstring(x, y, z):
    """Missing parameter z in docstring.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int
    :returns: Sum of the numbers
    :rtype: int
    """
    # DSV102: Parameter 'z' is in code but not documented
    return x + y + z


def extra_param_in_docstring(x, y):
    """Extra parameter in docstring.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int
    :param z: This parameter doesn't exist in code
    :type z: int
    :returns: Sum of the numbers
    :rtype: int
    """
    # DSV101: Parameter 'z' is documented but not in code
    return x + y


def type_mismatch(x, y):
    """Type mismatch between code and docstring.

    :param x: First number
    :type x: str
    :param y: Second number
    :type y: str
    :returns: Sum of the numbers
    :rtype: int
    """
    # DSV103: Parameter 'x' has type 'int' but docstring says 'str'
    # DSV103: Parameter 'y' has type 'int' but docstring says 'str'
    return x + y


def return_type_mismatch(x: int, y: int) -> str:
    """Return type mismatch.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int
    :returns: Sum of the numbers
    :rtype: int
    """
    # DSV201: Return type 'str' doesn't match documented type 'int'
    return str(x + y)


def missing_return_in_docstring(x: int, y: int) -> int:
    """Missing return in docstring.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int
    """
    # DSV202: Function returns 'int' but docstring has no Returns section
    return x + y


def void_but_documented() -> None:
    """Void function but documented return.

    :returns: Something
    :rtype: int
    """
    # DSV203: Function returns None but docstring has Returns section
    print("Hello")


def missing_exception(x: int):
    """Missing exception in docstring.

    :param x: Input number
    :type x: int
    :returns: Result
    :rtype: int
    """
    # DSV301: ValueError is raised but not documented
    if x < 0:
        raise ValueError("x must be positive")
    return x * 2


def exception_not_raised(x: int):
    """Exception not raised in code.

    :param x: Input number
    :type x: int
    :returns: Result
    :rtype: int
    :raises ValueError: If x is negative
    """
    # DSV302: ValueError is documented but never raised
    return x * 2


def optional_param_correct(x: int, y: int = 10):
    """Optional parameter correctly documented.

    :param x: First number
    :type x: int
    :param y: Second number with default value
    :type y: int, optional
    :returns: Sum
    :rtype: int
    """
    return x + y


def optional_param_mismatch(x: int, y: int):
    """Optional parameter mismatch.

    :param x: First number
    :type x: int
    :param y: Second number
    :type y: int, optional
    :returns: Sum
    :rtype: int
    """
    # DSV104: Parameter 'y' is required in code but marked optional in docstring
    return x + y
