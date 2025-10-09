"""Examples for DSV401: Side Effects Detection

This file demonstrates various side effects that should be documented:
- File I/O operations
- Print statements
- Global variable modifications
"""


# Example 1: File I/O without documentation
def write_log(message: str) -> None:
    """Write a log message.

    Args:
        message: The log message to write
    """
    with open("log.txt", "a") as f:
        f.write(f"{message}\n")


# Example 2: File I/O properly documented
def write_log_documented(message: str) -> None:
    """Write a log message to a file.

    Args:
        message: The log message to write

    Note:
        This function writes to the 'log.txt' file. Side effect: file I/O operation.
    """
    with open("log.txt", "a") as f:
        f.write(f"{message}\n")


# Example 3: Print statement without documentation
def debug_value(x: int) -> int:
    """Calculate and return doubled value.

    Args:
        x: The value to double

    Returns:
        The doubled value
    """
    print(f"Debug: x = {x}")
    return x * 2


# Example 4: Print statement properly documented
def debug_value_documented(x: int) -> int:
    """Calculate and return doubled value.

    Args:
        x: The value to double

    Returns:
        The doubled value

    Note:
        Prints debug information to stdout.
    """
    print(f"Debug: x = {x}")
    return x * 2


# Example 5: Global variable modification without documentation
counter = 0


def increment_counter() -> int:
    """Increment and return the current count.

    Returns:
        The incremented count
    """
    global counter
    counter += 1
    return counter


# Example 6: Global variable modification properly documented
total = 0


def add_to_total(value: int) -> int:
    """Add value to the global total.

    Args:
        value: The value to add

    Returns:
        The new total

    Note:
        Modifies the global 'total' variable.
    """
    global total
    total += value
    return total


# Example 7: Multiple side effects without documentation
log_count = 0


def log_and_count(message: str) -> None:
    """Log a message and count it.

    Args:
        message: The message to log
    """
    global log_count
    log_count += 1
    with open("messages.txt", "a") as f:
        f.write(f"{log_count}: {message}\n")
    print(f"Logged message #{log_count}")


# Example 8: Multiple side effects properly documented
processed_count = 0


def process_and_log(message: str) -> None:
    """Process a message and log it.

    Args:
        message: The message to process

    Note:
        Side effects:
        - Modifies global variable 'processed_count'
        - Writes to 'messages.txt' file
        - Prints to stdout
    """
    global processed_count
    processed_count += 1
    with open("messages.txt", "a") as f:
        f.write(f"{processed_count}: {message}\n")
    print(f"Processed message #{processed_count}")


# Example 9: Input() is also a side effect
def get_user_name() -> str:
    """Get the user's name.

    Returns:
        The user's name
    """
    return input("Enter your name: ")


# Example 10: Input() properly documented
def get_user_name_documented() -> str:
    """Get the user's name from user input.

    Returns:
        The user's name

    Note:
        Reads from stdin (interactive input).
    """
    return input("Enter your name: ")


# Example 11: No side effects - should not trigger DSV401
def pure_function(x: int, y: int) -> int:
    """Add two numbers.

    Args:
        x: First number
        y: Second number

    Returns:
        Sum of x and y
    """
    return x + y


# Example 12: Read operation without documentation
def read_config() -> str:
    """Read configuration from file.

    Returns:
        Configuration string
    """
    with open("config.txt", "r") as f:
        return f.read()


# Example 13: Read operation properly documented
def read_config_documented() -> str:
    """Read configuration from file.

    Returns:
        Configuration string

    Note:
        Reads from 'config.txt' file.
    """
    with open("config.txt", "r") as f:
        return f.read()
