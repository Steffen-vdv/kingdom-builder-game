"""Registry of command specs."""

from .base import CommandSpec
from .specs import GitSpec

# Register all available specs
_SPECS: dict[str, CommandSpec] = {
    "git": GitSpec(),
}


def get_spec(executable: str) -> CommandSpec | None:
    """Get the spec for a command, or None if not supported."""
    return _SPECS.get(executable)


def list_supported() -> list[str]:
    """Return list of supported command names."""
    return list(_SPECS.keys())
