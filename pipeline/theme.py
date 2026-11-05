"""Merge a preset with the user's theme.yaml."""
from __future__ import annotations

from pathlib import Path

import yaml

from .schema import TripError, both

PRESETS = Path(__file__).resolve().parent.parent / "presets"
DEFAULT_PRESET = "oahu"


def deep_merge(base: dict, override: dict) -> dict:
    merged = dict(base)
    for key, value in override.items():
        merged[key] = deep_merge(base[key], value) if isinstance(value, dict) and isinstance(base.get(key), dict) else value
    return merged


def load_theme(path: Path | None) -> dict:
    user = yaml.safe_load(path.read_text(encoding="utf-8")) or {} if path and path.exists() else {}
    preset = PRESETS / f'{user.get("preset", DEFAULT_PRESET)}.yaml'
    if not preset.exists():
        names = ", ".join(sorted(p.stem for p in PRESETS.glob("*.yaml")))
        raise TripError([both(f'unknown preset "{preset.stem}". Available: {names}',
                              f'preset desconhecido "{preset.stem}". Disponíveis: {names}')])
    return deep_merge(yaml.safe_load(preset.read_text(encoding="utf-8")), user)
