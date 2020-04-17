"""
Helper functions to go with collect.py
"""
# Standard library imports
from pathlib import Path
import os
import shutil
import sys

# Third-party library imports
import requests


def _start_from_scratch() -> None:
    """Delete all data and start from a clean slate."""
    to_clean = [
        "__pycache__",
        "data",
        "helpers/__pycache__",
        "original_data",
        "temp",
    ]
    if user_input_confirmation():
        for directory in to_clean:
            shutil.rmtree(directory, ignore_errors=True)
        print("Everything is clean now.")
    else:
        print("Nothing happened.")
    sys.exit(0)


def do_maintenance(func) -> None:
    """Decorator to run the script while performing some cleanup operations."""

    def cleaner_wrapper():
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

        func()  # main script happening here
        shutil.rmtree("temp", ignore_errors=True)

    return cleaner_wrapper


def download_data(filename: str, url: str) -> None:
    """Download given file by `url` based on the required `filename`."""
    url = f"{url}/{filename}"
    save_path = f"original_data/{filename}"
    print(f"Downloading '{filename}'...", end=" ")
    if os.path.isfile(save_path):
        print("Data already downloaded.")
    else:
        r = requests.get(url, allow_redirects=True)
        with open(save_path, "wb") as data_file:
            data_file.write(r.content)
            print("Done.")


def execute_on_all(iterable: list, func, func_settings, settings=None) -> None:
    """Take an `iterable` and do `func` on all items in `iterable`."""
    if func is download_data:
        if not settings["download"]:
            print("Skip downloading data. Run with `-d` to force download.")
            return
        func_setting_arg = func_settings
    for item in iterable:
        func(item, func_setting_arg)


def user_input_confirmation(
    message: str = "\nDo you want to delete all data and start from scratch? (y/n) ",
):
    """Asks the user to enter either "y" or "n" to confirm. Return boolean."""
    choice = None
    while choice is None:
        user_input = input(message)
        if user_input.lower() == "y":
            choice = True
        elif user_input.lower() == "n":
            choice = False
        else:
            print('Please enter either "y" or "n".')
    return choice
