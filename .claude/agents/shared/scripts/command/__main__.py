#!/usr/bin/env python3
"""
CLI entry point for the command parser.

Usage:
    python3 -m command 'git commit --amend -m "fix"'
    echo 'git commit --amend' | python3 -m command

Output: JSON to stdout
"""

import json
import sys

from . import parse_command


def main() -> None:
    if len(sys.argv) > 1:
        # Command passed as argument
        command = " ".join(sys.argv[1:])
    elif not sys.stdin.isatty():
        # Command piped via stdin
        command = sys.stdin.read().strip()
    else:
        print("Usage: python3 -m command '<command>'", file=sys.stderr)
        print("   or: echo '<command>' | python3 -m command", file=sys.stderr)
        sys.exit(1)

    result = parse_command(command)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
