"""
Helper functions to go with process.py
"""
# Standard library imports
import re


def _parse_line(line, regex_dict):
    """Regex search against `regex_dict`.
    Return the key and match result of the first matching regex."""
    for key, regex in regex_dict.items():
        match = regex.search(line)
        if match:
            return key, match
    return None, None  # no matches found


def generate_regex_dict() -> dict:
    """Return a dictionary of needed regular expressions to parse data."""
    rx_dict = {
        "group": re.compile(r"# group: (?P<group>.*)\n"),
        "subgroup": re.compile(r"# subgroup: (?P<subgroup>.*)\n"),
    }

    return rx_dict
