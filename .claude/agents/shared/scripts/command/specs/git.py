"""
Git command spec using git's built-in -h help output.

KNOWN LIMITATIONS
=================
This parser uses `git <subcommand> -h` to discover flags. This approach has
inherent limitations due to what git exposes in its help output:

1. INHERITED FLAGS NOT DOCUMENTED
   Some flags are inherited from parent commands but not shown in -h output.
   Example: `git log -n 5` — the `-n` flag comes from git-rev-list and doesn't
   appear in `git log -h`. Result: `-n` treated as boolean, `5` as positional.

2. FLAGS WITHOUT SHORT FORMS
   If git only documents `--some-flag` without a `-s` short form, we only
   recognize the long form. Using an undocumented short form will parse it
   as a boolean flag.

3. NON-STANDARD HELP OUTPUT
   If a subcommand has unusual `-h` formatting that doesn't match the regex
   pattern, flags may be missed. The regex expects lines like:
       -m, --[no-]message <message>
       -q, --[no-]quiet

4. COMBINED SHORT FLAGS NOT SUPPORTED
   Unlike generic parsers, we don't split `-abc` into `-a -b -c`. Git doesn't
   use this pattern, so it's not a practical issue, but worth noting.

WHAT WORKS WELL
===============
- `git commit -m "msg"` → flags: {"m": "msg"} ✓
- `git commit --amend` → flags: {"amend": true} ✓
- `git rebase -i HEAD~3` → flags: {"i": true} ✓
- `git checkout -b name` → flags: {"b": true}, positional: ["name"] ✓

The core use cases for hook enforcement (detecting --amend, -i, -m values,
--force, etc.) work correctly because these are documented in git's -h output.

Maintain this section as new edge cases are discovered through testing.
"""

import re
import subprocess
from functools import lru_cache
from typing import Any

from ..base import CommandSpec


@lru_cache(maxsize=64)
def _get_git_options(subcommand: str) -> tuple[frozenset[str], frozenset[str]]:
    """
    Get flag spec for a git subcommand using `git <subcommand> -h`.

    Parses output like:
        -m, --[no-]message <message>
        -q, --[no-]quiet

    Returns:
        (value_flags, boolean_flags) - frozensets of flag names without dashes

    Cached to avoid repeated subprocess calls.
    """
    try:
        result = subprocess.run(
            ["git", subcommand, "-h"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        # -h outputs to stderr and returns non-zero, but that's fine
        output = result.stderr or result.stdout
        if not output:
            return (frozenset(), frozenset())

        value_flags: set[str] = set()
        boolean_flags: set[str] = set()

        # Pattern for flag lines: -X, --[no-]long-name [<value>]
        # Examples:
        #   -m, --[no-]message <message>
        #   -q, --[no-]quiet
        #   -S, --[no-]gpg-sign[=<key-id>]
        flag_pattern = re.compile(
            r"^\s+"  # Leading whitespace
            r"(-([a-zA-Z]),\s*)?"  # Optional short flag: -m,
            r"--(\[no-\])?([a-zA-Z][-a-zA-Z0-9]*)"  # Long flag: --[no-]message
            r"(\[?=?<[^>]+>\]?)?"  # Attached value: [=<key>]
            r"(\s+<[^>]+>)?"  # Separated value: <message>
        )

        for line in output.split("\n"):
            match = flag_pattern.match(line)
            if match:
                short_flag = match.group(2)  # e.g., "m"
                long_flag = match.group(4)  # e.g., "message"
                # Value present in either attached [=<key>] or separated <message>
                has_value = match.group(5) or match.group(6)

                if has_value:
                    if short_flag:
                        value_flags.add(short_flag)
                    value_flags.add(long_flag)
                else:
                    if short_flag:
                        boolean_flags.add(short_flag)
                    boolean_flags.add(long_flag)

        return (frozenset(value_flags), frozenset(boolean_flags))
    except Exception:
        return (frozenset(), frozenset())


class GitSpec(CommandSpec):
    """
    Git command parser using git's own -h help output.

    Parses `git <subcommand> -h` output to discover both short and long flags,
    including which flags take values. This ensures we use git's authoritative
    flag definitions rather than maintaining our own potentially outdated list.
    """

    def get_name(self) -> str:
        return "git"

    def supports(self, subcommand: str | None) -> bool:
        if subcommand is None:
            return False
        value_flags, boolean_flags = _get_git_options(subcommand)
        # If we got any flags, the subcommand is valid
        return bool(value_flags or boolean_flags)

    def parse(self, subcommand: str | None, args: list[str]) -> dict[str, Any]:
        if subcommand is None:
            return {
                "flags": {},
                "positional": args,
                "error": "git requires a subcommand",
            }

        value_flags, boolean_flags = _get_git_options(subcommand)

        if not value_flags and not boolean_flags:
            return {
                "flags": {},
                "positional": args,
                "error": f"unknown git subcommand: {subcommand}",
            }

        flags: dict[str, Any] = {}
        positional: list[str] = []
        i = 0

        while i < len(args):
            arg = args[i]

            if arg == "--":
                # Everything after -- is positional
                positional.extend(args[i + 1 :])
                break
            elif arg.startswith("--"):
                flag_part = arg[2:]

                # Handle --flag=value format
                if "=" in flag_part:
                    name, value = flag_part.split("=", 1)
                    flags[name] = value
                elif flag_part in value_flags and i + 1 < len(args):
                    # This flag takes a value
                    flags[flag_part] = args[i + 1]
                    i += 1
                else:
                    # Boolean flag (or unknown, treat as boolean)
                    flags[flag_part] = True
            elif arg.startswith("-") and len(arg) > 1:
                flag_char = arg[1:]

                # Short flags: check if it takes a value
                if flag_char in value_flags and i + 1 < len(args):
                    flags[flag_char] = args[i + 1]
                    i += 1
                else:
                    # Boolean or combined flags
                    flags[flag_char] = True
            else:
                positional.append(arg)

            i += 1

        return {"flags": flags, "positional": positional, "error": None}
