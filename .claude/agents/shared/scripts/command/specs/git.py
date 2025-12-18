"""
Git command spec using git's built-in help output.

ARCHITECTURE
============
This spec builds structured knowledge from git's authoritative help output,
then uses that knowledge via lookups (not string matching) to parse commands.

Two knowledge sources:
1. `git --help` → global flags that can appear before the subcommand
2. `git <subcommand> -h` → subcommand-specific flags

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
- `git -C /path push` → subcommand: "push" ✓ (global flag handled)

The core use cases for hook enforcement (detecting --amend, -i, -m values,
--force, etc.) work correctly because these are documented in git's -h output.

Maintain this section as new edge cases are discovered through testing.
"""

import re
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from ..base import CommandSpec


# =============================================================================
# Structured Knowledge: Global Flags (from `git --help`)
# =============================================================================


@dataclass(frozen=True)
class GitGlobalFlags:
    """
    Structured representation of git's global flags.

    Built by parsing `git --help` output. Used for lookups when extracting
    the subcommand from a command line.
    """

    short_value_flags: frozenset[str]  # e.g., {"C", "c"} - take next arg
    short_boolean_flags: frozenset[str]  # e.g., {"p", "P"} - standalone
    long_value_flags: frozenset[str]  # e.g., {"git-dir", "work-tree"}
    long_boolean_flags: frozenset[str]  # e.g., {"no-pager", "bare"}

    def is_short_flag(self, name: str) -> bool:
        """Check if name is a known short global flag."""
        return name in self.short_value_flags or name in self.short_boolean_flags

    def is_long_flag(self, name: str) -> bool:
        """Check if name is a known long global flag."""
        return name in self.long_value_flags or name in self.long_boolean_flags

    def short_takes_value(self, name: str) -> bool:
        """Check if short flag takes a value argument."""
        return name in self.short_value_flags

    def long_takes_value(self, name: str) -> bool:
        """Check if long flag takes a value argument."""
        return name in self.long_value_flags


@lru_cache(maxsize=1)
def _parse_git_global_flags() -> GitGlobalFlags:
    """
    Parse `git --help` to discover global flags.

    Git's help output includes a usage line showing global options:
        usage: git [-v | --version] [-h | --help] [-C <path>] [-c <name>=<value>]
                   [--git-dir=<path>] [--work-tree=<path>] ...

    This function parses that output to build a structured GitGlobalFlags
    object that can be used for lookups.

    Returns:
        GitGlobalFlags with all discovered global flags categorized by type
    """
    try:
        result = subprocess.run(
            ["git", "--help"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        output = result.stdout or result.stderr
        if not output:
            return GitGlobalFlags(
                frozenset(), frozenset(), frozenset(), frozenset()
            )

        short_value: set[str] = set()
        short_boolean: set[str] = set()
        long_value: set[str] = set()
        long_boolean: set[str] = set()

        # Parse the usage lines at the start of git --help
        # Stop when we hit command descriptions
        for line in output.split("\n"):
            if not line.strip():
                continue
            if line.startswith("These are common"):
                break
            if "usage:" not in line and not line.startswith(" "):
                break

            # Find flag patterns in square brackets: [-C <path>], [--bare]
            for match in re.finditer(r"\[([^\]]+)\]", line):
                content = match.group(1)

                # Handle alternatives: -v | --version
                for alt in content.split("|"):
                    alt = alt.strip()
                    if not alt.startswith("-"):
                        continue

                    # Check for value indicator: <...> or =<...>
                    has_value = "<" in alt or "=" in alt

                    # Extract and categorize the flag
                    if alt.startswith("--"):
                        # Long flag: --git-dir=<path> or --bare
                        flag_name = alt[2:].split("=")[0].split("<")[0].split()[0]
                        flag_name = flag_name.rstrip("[")
                        if has_value:
                            long_value.add(flag_name)
                        else:
                            long_boolean.add(flag_name)
                    elif alt.startswith("-") and len(alt) >= 2:
                        # Short flag: -C <path> or -p
                        flag_char = alt[1:].split()[0].split("<")[0]
                        if len(flag_char) == 1:
                            if has_value:
                                short_value.add(flag_char)
                            else:
                                short_boolean.add(flag_char)

        return GitGlobalFlags(
            short_value_flags=frozenset(short_value),
            short_boolean_flags=frozenset(short_boolean),
            long_value_flags=frozenset(long_value),
            long_boolean_flags=frozenset(long_boolean),
        )
    except Exception:
        return GitGlobalFlags(frozenset(), frozenset(), frozenset(), frozenset())


# =============================================================================
# Structured Knowledge: Subcommand Flags (from `git <subcommand> -h`)
# =============================================================================


@lru_cache(maxsize=64)
def _parse_git_subcommand_flags(
    subcommand: str,
) -> tuple[frozenset[str], frozenset[str]]:
    """
    Parse `git <subcommand> -h` to discover subcommand-specific flags.

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
        output = result.stderr or result.stdout
        if not output:
            return (frozenset(), frozenset())

        value_flags: set[str] = set()
        boolean_flags: set[str] = set()

        # Pattern for flag lines: -X, --[no-]long-name [<value>]
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
                short_flag = match.group(2)
                long_flag = match.group(4)
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


# =============================================================================
# GitSpec Implementation
# =============================================================================


class GitSpec(CommandSpec):
    """
    Git command parser using git's own help output.

    Parses `git --help` for global options and `git <subcommand> -h` for
    subcommand-specific flags. Uses structured lookups (not string matching)
    to interpret input commands.
    """

    def get_name(self) -> str:
        return "git"

    def supports(self, subcommand: str | None) -> bool:
        """Check if subcommand is a valid git command by querying git."""
        if subcommand is None:
            return False
        value_flags, boolean_flags = _parse_git_subcommand_flags(subcommand)
        return bool(value_flags or boolean_flags)

    def extract_subcommand(self, args: list[str]) -> tuple[str | None, list[str]]:
        """
        Extract the git subcommand using structured global flags knowledge.

        Uses GitGlobalFlags (built from `git --help`) to identify and skip
        global flags, then returns the first non-global-flag argument that
        git recognizes as a valid subcommand.

        This method uses lookups into the structured GitGlobalFlags object,
        not string pattern matching on the input.
        """
        global_flags = _parse_git_global_flags()
        i = 0

        while i < len(args):
            arg = args[i]

            # Check for long flag with = syntax: --flag=value
            if arg.startswith("--") and "=" in arg:
                flag_name = arg[2:].split("=", 1)[0]
                if global_flags.is_long_flag(flag_name):
                    i += 1
                    continue
                # Unknown long flag with value - stop, might be subcommand arg
                break

            # Check for long flag: --flag or --flag value
            if arg.startswith("--"):
                flag_name = arg[2:]
                if global_flags.is_long_flag(flag_name):
                    if global_flags.long_takes_value(flag_name):
                        i += 2  # Skip flag and its value
                    else:
                        i += 1  # Skip boolean flag
                    continue
                # Unknown long flag - stop
                break

            # Check for short flag: -X or -X value
            if arg.startswith("-") and len(arg) == 2:
                flag_char = arg[1]
                if global_flags.is_short_flag(flag_char):
                    if global_flags.short_takes_value(flag_char):
                        i += 2  # Skip flag and its value
                    else:
                        i += 1  # Skip boolean flag
                    continue
                # Unknown short flag - stop
                break

            # Not a recognized global flag pattern - check if it's a subcommand
            if self.supports(arg):
                return arg, args[i + 1 :]

            # Not a global flag, not a subcommand - stop
            break

        return None, args

    def parse(self, subcommand: str | None, args: list[str]) -> dict[str, Any]:
        """Parse subcommand arguments using structured flag knowledge."""
        if subcommand is None:
            return {
                "flags": {},
                "positional": args,
                "error": "git requires a subcommand",
            }

        value_flags, boolean_flags = _parse_git_subcommand_flags(subcommand)

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
                positional.extend(args[i + 1 :])
                break
            elif arg.startswith("--"):
                flag_part = arg[2:]
                if "=" in flag_part:
                    name, value = flag_part.split("=", 1)
                    flags[name] = value
                elif flag_part in value_flags and i + 1 < len(args):
                    flags[flag_part] = args[i + 1]
                    i += 1
                else:
                    flags[flag_part] = True
            elif arg.startswith("-") and len(arg) > 1:
                flag_char = arg[1:]
                if flag_char in value_flags and i + 1 < len(args):
                    flags[flag_char] = args[i + 1]
                    i += 1
                else:
                    flags[flag_char] = True
            else:
                positional.append(arg)

            i += 1

        return {"flags": flags, "positional": positional, "error": None}
