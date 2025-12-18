"""Command parsing library for hook enforcement."""

from .parse import parse_command
from .registry import get_spec, list_supported

__all__ = ["parse_command", "get_spec", "list_supported"]
