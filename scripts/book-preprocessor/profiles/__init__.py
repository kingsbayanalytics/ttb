"""Book profile registry for the reusable companion pre-processor."""

from __future__ import annotations

from typing import Any, Callable
from . import anna_riva_psalms

ProfileFn = Callable[[list[dict[str, Any]], dict[str, Any]], tuple[dict[str, Any], dict[str, Any]]]

PROFILES: dict[str, ProfileFn] = {
    "anna-riva-psalms": anna_riva_psalms.parse_book,
}
