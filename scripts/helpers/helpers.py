"""
Helper functions to go with process.py
"""
# Standard library imports
from operator import itemgetter
import csv
import os
import re
import string
import sys
import urllib3

# Source of data
DATA_SOURCE = "https://unicode.org/Public/emoji/latest/emoji-test.txt"

# Paths to write data
IN_PATH = "original_data/emojis.txt"
OUT_PATH = "../data/emojis.csv"
PROCESS_PATH = "original_data/emojis-parsed.csv"  # temporary file

# Name of columns in CSV
CSV_COLUMNS = [
    "Group",
    "Subgroup",
    "CodePoint",
    "Status",
    "Representation",
    "Name",
    "Section",
]


def _parse_line(line: str, regex_dict: dict) -> tuple:
    """Regex search against `regex_dict`.
    Return the key and match result of the first matching regex."""
    for key, regex in regex_dict.items():
        match = regex.search(line)
        if match:
            return key, match
    return None, None  # no matches found


def write_row(group: dict, writer):
    """Take a dict and append a row to a CSV file from a CSV `writer`."""
    for group_name, subgroup in group.items():
        for subgroup_name, emojis in subgroup.items():
            for emoji in emojis:
                emoji_dict = {
                    "Group": group_name,
                    "Subgroup": subgroup_name,
                    "CodePoint": emoji["code_point"],
                    "Status": emoji["status"],
                    "Representation": emoji["representation"],
                    "Name": emoji["name"],
                    "Section": emoji["section"],
                }
                writer.writerow(emoji_dict)


def sort_data(out_path: str, csv_columns: list):
    """Take a `str` as filepath to a CSV and sort the data
    based on the first column in `csv_columns`."""
    with open(out_path) as csvfile:
        reader = csv.reader(csvfile)
        rows = list(reader)

    # Sort according to first column
    rows = sorted(rows[1:], key=itemgetter(0),)

    # save data
    writer = csv.writer(open(out_path, "w"), lineterminator="\n")
    writer.writerow(csv_columns)
    writer.writerows(rows)


def dict_to_csv(
        data: list, csv_columns: list, process_path: str, out_path: str
) -> None:
    """Convert Python dict to CSV format and write content to file."""
    try:
        with open(process_path, "w") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=csv_columns)
            writer.writeheader()
            for group in data:
                write_row(group, writer)
    except IOError:
        print("I/O error. Aborting script.")
        sys.exit(0)

    sort_data(process_path, csv_columns)
    os.replace(process_path, out_path)


def download_data(source, in_path):
    """Download data and store it in .cache/ folder. Overwrite file if it
    already exists."""
    http = urllib3.PoolManager()
    resp = http.request("GET", source, preload_content=False)
    with open(in_path, "wb") as out:
        out.write(resp.data)
    resp.release_conn()


def get_regex_dict() -> dict:
    """Return a dictionary of needed regular expressions to parse data."""
    rx_dict = {
        # lines starting with "# group: "
        "group": re.compile(r"# group: (?P<group>.*)\n"),
        # lines starting with "# subgroup: "
        "subgroup": re.compile(r"# subgroup: (?P<subgroup>.*)\n"),
        # lines starting with a digit, then parsed with the following format:
        # `codepoint`;`status`#`representation`E`section` `name`
        "emoji": re.compile(
            r"(?P<code_point>^\d[^;]+);(?P<status>[^#]+)#"
            r"(?P<representation>[^E]+)(?P<section>[^ ]+) +(?P<name>.*)"
        ),
    }

    return rx_dict


def clean_data(field, field_type=None):
    """Take `field` as input and based on its `field_type`, reformat it
    appropriately for a CSV file."""
    result = ""
    if field_type is None:
        for char in field:
            if char == "&":
                char = "-"
            if char in string.digits + string.ascii_letters + "-":
                result += char

    if field_type == "code_point":
        for char in field:
            if char in string.digits + string.ascii_letters + " " + "-":
                result += char

    if field_type == "name":
        for char in field:
            if char in string.digits + string.ascii_letters + " " + "-":
                result += char
        result = f"|{result}|"

    if field_type == "representation":
        result = field

    return result.strip()


def add_emoji(match, group, group_dict, subgroup):
    """Append emoji to the list in the current subgroup."""
    emoji = {
        "code_point": clean_data(
            match.group("code_point"), field_type="code_point",
        ),
        "status": clean_data(match.group("status")),
        "representation": clean_data(
            match.group("representation"), field_type="representation",
        ),
        "section": match.group("section"),
        "name": clean_data(match.group("name"), field_type="name"),
    }
    group_dict[group][subgroup].append(emoji)


def parse_file(in_path, regex_dict):
    """Return a list of useful lines for file `in_path`.
    Remove headers, empty lines and lines that are not useful for this
    script.

    The list being returned is of the following form:

        data = [
            {"Group name of emoji":
                {"Subgroup name of emoji": [ list_of_emojis_as_dict ] }
            },
            {... more emoji groups ...},
        ]

    More concretely, all the key/value pairs are as follows:

        data = [
            {"Group":
                {"subgroup":
                    [
                        {
                            "code_point": "str",
                            "status": "str",
                            "representation": "str",
                            "section": "str",
                            "name": "str"
                        },
                        {... more emojis ...}
                    ]
                },
                {... more subgroups ...},

            },
            {... more groups ...},
        ]

    data = `list` of `dict` containing groups
        -> Groups = `dict` containing subgroups
            -> Subgroups = `list` containing emojis
                -> Emoji = `dict` containing `str` of information
    """

    data = []  # collect useful data

    with open(in_path) as infile:
        line = infile.readline()
        while line:
            # at each line check for a match with a Regex
            key, match = _parse_line(line, regex_dict)

            if key == "group":
                group = clean_data(match.group("group"))
                group_dict = {
                    group: {},
                }
                line = infile.readline()
                key, match = _parse_line(line, regex_dict)
                while line:
                    key, match = _parse_line(line, regex_dict)
                    if key == "subgroup":
                        subgroup = clean_data(match.group("subgroup"))
                        group_dict[group][subgroup] = []
                        line = infile.readline()
                        key, match = _parse_line(line, regex_dict)
                        if key == "group":
                            # We are done with this subgroup and break out to
                            # process the next group.
                            break
                        while line:
                            key, match = _parse_line(line, regex_dict)
                            if key == "emoji":
                                add_emoji(match, group, group_dict, subgroup)
                                line = infile.readline()
                                key, match = _parse_line(line, regex_dict)
                            # If next line is a group or subgroup, we no longer
                            # process emojis and break out of this `while` loop.
                            elif key in ("subgroup", "group"):
                                break
                            else:
                                line = infile.readline()

                    elif key == "group":
                        # If we find a new group (line matching "# group:"),
                        # we need to break out of the "subgroup" `while` loop.
                        break
                    else:
                        line = infile.readline()

                data.append(group_dict)

            else:  # was not a group, then go to next line and repeat
                line = infile.readline()

    return data


def run():
    """Download, parse, sort and validate data."""
    download_data(DATA_SOURCE, IN_PATH)
    regex_dict = get_regex_dict()
    data = parse_file(IN_PATH, regex_dict)
    dict_to_csv(data, CSV_COLUMNS, PROCESS_PATH, OUT_PATH)
