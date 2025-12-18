#!/usr/bin/env python3
"""
Parse shell commands into structured components.

Usage:
    python3 -m command.parse '<command>'

Output:
    JSON object with parsed command structure.

Example:
    $ python3 -m command.parse 'git commit --amend -m "fix"'
    {
      "supported": true,
      "executable": "git",
      "subcommand": "commit",
      "flags": {"amend": true, "m": "fix"},
      "positional": [],
      "paths": [],
      "raw": "git commit --amend -m \"fix\""
    }
"""

import json
import shlex
import sys
from typing import Any

from .registry import get_spec


def parse_command(command: str) -> dict[str, Any]:
    """
    Parse a shell command into structured components.

    Uses shlex for tokenization, then delegates to command-specific specs
    when available. Falls back to generic parsing for unsupported commands.

    Args:
        command: Shell command string

    Returns:
        Structured dict with executable, subcommand, flags, positional, etc.
    """
    # Tokenize with shlex
    try:
        tokens = shlex.split(command)
    except ValueError as e:
        return {
            "supported": False,
            "error": str(e),
            "executable": "",
            "subcommand": None,
            "args": [],
            "flags": {},
            "positional": [],
            "paths": [],
            "raw": command,
        }

    if not tokens:
        return {
            "supported": False,
            "error": "empty command",
            "executable": "",
            "subcommand": None,
            "args": [],
            "flags": {},
            "positional": [],
            "paths": [],
            "raw": command,
        }

    executable = tokens[0]
    args = tokens[1:]

    # Try to find a spec for this command
    spec = get_spec(executable)

    if spec is not None:
        # Determine subcommand (first non-flag argument)
        subcommand = None
        remaining_args = args

        if args and not args[0].startswith("-"):
            subcommand = args[0]
            remaining_args = args[1:]

        if spec.supports(subcommand):
            result = spec.parse(subcommand, remaining_args)
            return {
                "supported": True,
                "error": result.get("error"),
                "executable": executable,
                "subcommand": subcommand,
                "args": args,
                "flags": result["flags"],
                "positional": result["positional"],
                "paths": _extract_paths(args),
                "raw": command,
            }

    # Fallback: generic parsing (flags as list, not parsed)
    return {
        "supported": False,
        "error": f"no spec for '{executable}'",
        "executable": executable,
        "subcommand": args[0] if args and not args[0].startswith("-") else None,
        "args": args,
        "flags": [a for a in args if a.startswith("-")],
        "positional": [a for a in args if not a.startswith("-")],
        "paths": _extract_paths(args),
        "raw": command,
    }


def _extract_paths(args: list[str]) -> list[str]:
    """Extract path-like arguments (contain / or start with .)."""
    return [a for a in args if "/" in a or a.startswith(".")]


def main() -> None:
    """CLI entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    result = parse_command(command)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
