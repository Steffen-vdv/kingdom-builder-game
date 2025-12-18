"""Base class for command-specific parsers."""

from abc import ABC, abstractmethod
from typing import Any


class CommandSpec(ABC):
    """
    Abstract base class for command-specific argument parsers.

    Each spec knows how to parse arguments for a specific command family
    (e.g., git, docker, npm). Specs use authoritative sources for flag
    definitions rather than custom heuristics.
    """

    @abstractmethod
    def get_name(self) -> str:
        """Return the command name this spec handles (e.g., 'git')."""
        pass

    @abstractmethod
    def parse(self, subcommand: str | None, args: list[str]) -> dict[str, Any]:
        """
        Parse arguments for a subcommand.

        Args:
            subcommand: The subcommand (e.g., 'commit' for 'git commit')
            args: Arguments after the subcommand

        Returns:
            {
                "flags": {"flag_name": value, ...},  # True for boolean flags
                "positional": ["arg1", "arg2", ...],
                "error": None or "error message"
            }
        """
        pass

    @abstractmethod
    def supports(self, subcommand: str | None) -> bool:
        """
        Return True if this spec can parse the given subcommand.

        Args:
            subcommand: The subcommand to check, or None for base command
        """
        pass

    def extract_subcommand(self, args: list[str]) -> tuple[str | None, list[str]]:
        """
        Extract the subcommand from argument list.

        Some commands (like git) have global flags that can appear before
        the subcommand. Override this method to handle such cases.

        Args:
            args: All arguments after the executable

        Returns:
            (subcommand, remaining_args) where remaining_args excludes
            both global flags and the subcommand itself
        """
        # Default: first non-flag argument is the subcommand
        if args and not args[0].startswith("-"):
            return args[0], args[1:]
        return None, args
