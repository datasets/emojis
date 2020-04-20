"""
Helper functions to go with collect.py
"""
# Standard library imports
from pathlib import Path
import os
import shutil
import sys

# Third-party library imports
import click
import requests

# Local imports
from .settings import DATA, SETTINGS


def _start_from_scratch() -> None:
    """Delete all data and start from a clean slate."""
    to_clean = [
        "__pycache__",
        "data",
        "helpers/__pycache__",
        "original_data",
        "temp",
    ]
    if click.confirm(
        "Do you want to delete all data and start from scratch?",
        default=False,
        abort=True,
        prompt_suffix=": ",
        show_default=True,
        err=False,
    ):
        for directory in to_clean:
            shutil.rmtree(directory, ignore_errors=True)
        click.secho("Everything is clean now.", fg="green", bold="True")
    sys.exit(0)


def do_maintenance(func, *args, **kwargs):
    """Decorator to run the script while performing some cleanup operations."""

    def cleaner_wrapper(*args, **kwargs):
        """Take care of creation and deletion of directories."""
        to_create = [
            "data",
            "original_data",
            "temp",
        ]
        shutil.rmtree("temp", ignore_errors=True)  # remove, there or not

        for directory in to_create:
            # we don't want to replace anything already there
            if not os.path.isdir(directory):
                os.mkdir(directory)

        func(*args, **kwargs)  # main script happening here

        shutil.rmtree("temp", ignore_errors=True)

    return cleaner_wrapper


def download_all_data() -> None:
    """Download all sources of data defined in `DATA["sources"]`."""
    execute_on_all(DATA["sources"], download_data)


def download_data(filename: str, url: str) -> None:
    """Download given file by `url` based on the required `filename`."""
    url = f"{url}/{filename}"
    save_path = f"original_data/{filename}"
    print(f"→ '{filename}'...", end=" ")
    if os.path.isfile(save_path):
        click.secho("Data already downloaded.", fg="blue", bold=True)
    else:
        request = requests.get(url, allow_redirects=True)
        with open(save_path, "wb") as data_file:
            data_file.write(request.content)

        # delete the file if the retrieved dataset doesn't exist
        # (file size < 1000 bytes)
        if Path(save_path).stat().st_size < 1000:
            # printed on the same line containing the dataset name
            click.secho("DATA NOT FOUND.", fg="yellow", bold=True)
            os.remove(save_path)
        else:
            print()  # when dataset is found, start a new line


def execute_on_all(iterable: list, func) -> None:
    """Take an `iterable` and do `func` on all items in `iterable`."""
    if func is download_data:
        if not SETTINGS["download"]:
            print("Skip downloading data. Run with `-d` to force download.")
            return
        func_arg = DATA["url"]
        click.secho("Downloading data", fg="green", bold=True)
    for item in iterable:
        func(item, func_arg)
