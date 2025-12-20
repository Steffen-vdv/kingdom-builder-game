#!/usr/bin/env python3
"""
Parse shell commands into structured components.

Uses bashlex for proper shell parsing, understanding command chains (&&, ||, ;, |).

Usage:
    python3 -m command.parse '<command>'

Output:
    JSON object with parsed command structure. Always includes 'commands' array
    for chain-aware parsing. Single commands have one element.

Example:
    $ python3 -m command.parse 'git status && git push'
    {
      "commands": [
        {"executable": "git", "subcommand": "status", ...},
        {"executable": "git", "subcommand": "push", ...}
      ],
      "operators": ["&&"],
      "raw": "git status && git push",
      # For backward compatibility, first command fields at top level:
      "executable": "git",
      "subcommand": "status",
      ...
    }
"""

import json
import shlex
import sys
from typing import Any

from .registry import get_spec

# Try to import bashlex, fall back to shlex if not available
try:
    import bashlex
    BASHLEX_AVAILABLE = True
except ImportError:
    BASHLEX_AVAILABLE = False


def _parse_single_command(tokens: list[str], raw: str) -> dict[str, Any]:
    """Parse a single command from its tokens using spec if available."""
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
            "raw": raw,
        }

    executable = tokens[0]
    args = tokens[1:]

    spec = get_spec(executable)

    if spec is not None:
        subcommand, remaining_args = spec.extract_subcommand(args)

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
                "raw": raw,
            }

    return {
        "supported": False,
        "error": f"no spec for '{executable}'",
        "executable": executable,
        "subcommand": args[0] if args and not args[0].startswith("-") else None,
        "args": args,
        "flags": [a for a in args if a.startswith("-")],
        "positional": [a for a in args if not a.startswith("-")],
        "paths": _extract_paths(args),
        "raw": raw,
    }


def _extract_command_text(node, full_command: str) -> str:
    """Extract the raw text of a command node from the full command string."""
    return full_command[node.pos[0]:node.pos[1]]


def _extract_commands_bashlex(command: str) -> tuple[list[dict], list[str]]:
    """
    Use bashlex to parse command chains.

    Returns:
        Tuple of (list of parsed commands, list of operators between them)
    """
    commands = []
    operators = []

    try:
        parts = bashlex.parse(command)
    except Exception:
        # If bashlex fails, fall back to treating as single command
        return None, None

    def visit_node(node):
        """Recursively visit nodes, extracting commands and operators."""
        if node.kind == 'command':
            # Extract command text and tokens
            cmd_text = _extract_command_text(node, command)
            tokens = []
            for part in node.parts:
                if part.kind == 'word':
                    tokens.append(part.word)
            if tokens:
                parsed = _parse_single_command(tokens, cmd_text)
                commands.append(parsed)

        elif node.kind == 'pipeline':
            # Pipeline: cmd1 | cmd2
            for i, part in enumerate(node.parts):
                visit_node(part)
                if i < len(node.parts) - 1:
                    operators.append('|')

        elif node.kind == 'list':
            # List: cmd1 && cmd2, cmd1 || cmd2, cmd1 ; cmd2
            for i, part in enumerate(node.parts):
                visit_node(part)
                if i < len(node.parts) - 1:
                    # Determine operator from position
                    end_pos = node.parts[i].pos[1]
                    start_pos = node.parts[i + 1].pos[0]
                    between = command[end_pos:start_pos].strip()
                    if '&&' in between:
                        operators.append('&&')
                    elif '||' in between:
                        operators.append('||')
                    elif ';' in between:
                        operators.append(';')
                    else:
                        operators.append('?')

        elif node.kind == 'compound':
            # Compound commands (subshells, etc.)
            if hasattr(node, 'list'):
                for part in node.list:
                    visit_node(part)

        elif hasattr(node, 'parts'):
            for part in node.parts:
                visit_node(part)

    for part in parts:
        visit_node(part)

    return commands, operators


def parse_command(command: str) -> dict[str, Any]:
    """
    Parse a shell command into structured components.

    Uses bashlex for proper shell parsing when available, understanding
    command chains (&&, ||, ;, |). Falls back to shlex for simple parsing.

    Args:
        command: Shell command string

    Returns:
        Structured dict with:
        - commands: Array of parsed commands (always present)
        - operators: Array of operators between commands
        - Plus first command's fields at top level for backward compatibility
    """
    commands = []
    operators = []

    # Try bashlex first for chain-aware parsing
    if BASHLEX_AVAILABLE:
        cmds, ops = _extract_commands_bashlex(command)
        if cmds is not None:
            commands = cmds
            operators = ops if ops else []

    # Fall back to shlex if bashlex failed or unavailable
    if not commands:
        try:
            tokens = shlex.split(command)
            if tokens:
                commands = [_parse_single_command(tokens, command)]
        except ValueError as e:
            commands = [{
                "supported": False,
                "error": str(e),
                "executable": "",
                "subcommand": None,
                "args": [],
                "flags": {},
                "positional": [],
                "paths": [],
                "raw": command,
            }]

    if not commands:
        commands = [{
            "supported": False,
            "error": "empty command",
            "executable": "",
            "subcommand": None,
            "args": [],
            "flags": {},
            "positional": [],
            "paths": [],
            "raw": command,
        }]

    # Build result with chain info
    result = {
        "commands": commands,
        "operators": operators,
        "raw": command,
    }

    # For backward compatibility, include first command's fields at top level
    first = commands[0]
    result.update({
        "supported": first.get("supported", False),
        "error": first.get("error"),
        "executable": first.get("executable", ""),
        "subcommand": first.get("subcommand"),
        "args": first.get("args", []),
        "flags": first.get("flags", {}),
        "positional": first.get("positional", []),
        "paths": first.get("paths", []),
    })

    return result


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
