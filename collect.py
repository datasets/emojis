"""

"""
# Standard library imports
import argparse

# Local imports
from helpers.helpers import (
    _start_from_scratch,
    do_maintenance,
    download_data,
    execute_on_all,
)

# Quick settings
SETTINGS = {
    "download": True,  # set to false to prevent automatic downloading
}

DATA = {
    "sources": [
        "emoji-data.txt",
        "emoji-sequences.txt",
        "emoji-test.txt",
        "emoji-variation-sequences.txt",
        "emoji-zwj-sequences.txt",
    ],
    "url": "https://unicode.org/Public/emoji/11.0/",
}


@do_maintenance
def run() -> None:
    """Main function to run the script. The action happens here."""
    execute_on_all(
        DATA["sources"],
        download_data,
        func_settings=DATA["url"],
        settings=SETTINGS,
    )


if __name__ == "__main__":
    # initiate the parser
    PARSER = argparse.ArgumentParser()
    PARSER.add_argument(
        "-d", "--download", help="Force download of data", action="store_true",
    )
    PARSER.add_argument(
        "-r",
        "--reset",
        help="Start from scratch: delete everything",
        action="store_true",
    )

    # read arguments from the command line
    ARGUMENTS = PARSER.parse_args()

    if ARGUMENTS.reset:
        _start_from_scratch()

    if ARGUMENTS.download:
        SETTINGS["download"] = True

    run()
