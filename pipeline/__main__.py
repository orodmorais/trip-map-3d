"""Command line: python -m pipeline check|build trip.yaml"""
from __future__ import annotations

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .geocode import DEFAULT_GEOCODER, load_lock, photon_searcher, resolve_places, save_lock, timezone_for
from .regions import assign_days, build_maps
from .scene import build_scene, write_scene
from .schema import TripError, load_trip
from .terrain import TerrainError, cached_terrain, write_terrain
from .texture import paint, write_texture
from .theme import load_theme
from .vectors import cached_vectors

CACHE_DIR = Path(".cache")
MAP_WORKERS = 3


def prepare(path: Path) -> tuple[dict, list[str]]:
    """Validate, geocode and group a trip. Returns the trip and a report for the user to review."""
    trip = load_trip(path)
    lock_path = path.with_name("trip.lock.json")
    lock = load_lock(lock_path)
    geocoder = trip["services"].get("geocoder", DEFAULT_GEOCODER)
    try:
        places, report = resolve_places(trip, lock, photon_searcher(geocoder))
    finally:
        save_lock(lock_path, lock)
    maps = build_maps(places, trip["region_max_km"])
    centers = [((m["bbox"]["lat0"] + m["bbox"]["lat1"]) / 2, (m["bbox"]["lon0"] + m["bbox"]["lon1"]) / 2) for m in maps]
    timed = [{**m, "timezone": trip["timezone"] or timezone_for(*c, lock)} for m, c in zip(maps, centers)]
    save_lock(lock_path, lock)
    days = assign_days(trip["days"], timed)
    report += [f'map "{m["title"]}": {len(m["places"])} places, {m["bbox"]["km_x"]:.0f} x {m["bbox"]["km_y"]:.0f} km, '
               f'{m["timezone"]}' for m in timed]
    report += [f'day {d["n"]} crosses maps: ' + " -> ".join(leg["map"] for leg in d["legs"])
               for d in days if d["crosses_maps"]]
    return {**trip, "places": places, "maps": timed, "days": days}, trip["warnings"] + report


def build_map(item: dict, theme: dict, out_dir: Path) -> list[str]:
    terrain, notes = cached_terrain(item["bbox"], CACHE_DIR)
    vectors = cached_vectors(item["bbox"], CACHE_DIR)
    chosen = theme["map"].get("exaggeration", "auto")
    meta = terrain["meta"] if chosen == "auto" else {**terrain["meta"], "exaggeration": float(chosen)}
    terrain = {**terrain, "meta": meta}
    image, ocean = paint(terrain, vectors, theme["map"])
    folder = out_dir / "data" / item["id"]
    write_terrain({**terrain, "meta": {**meta, "ocean": ocean}}, folder)
    write_texture(image, folder)
    write_scene(build_scene(terrain, vectors), folder)
    title = f'map "{item["title"]}"'
    return [f"{title}: {note}" for note in notes] + [
        f'{title}: grid {meta["NX"]}x{meta["NY"]}, vertical exaggeration {meta["exaggeration"]}x']


def build(trip: dict, theme: dict, out_dir: Path) -> list[str]:
    with ThreadPoolExecutor(MAP_WORKERS) as pool:
        results = pool.map(lambda item: build_map(item, theme, out_dir), trip["maps"])
    return [line for lines in results for line in lines]


def main() -> int:
    parser = argparse.ArgumentParser(prog="pipeline", description="Build a 3D trip map website.")
    parser.add_argument("command", choices=["check", "build"])
    parser.add_argument("trip", type=Path)
    parser.add_argument("--out", type=Path, default=Path("dist"))
    args = parser.parse_args()
    try:
        trip, report = prepare(args.trip)
        if args.command == "build":
            report += build(trip, load_theme(args.trip.with_name("theme.yaml")), args.out)
    except TripError as exc:
        print("\n".join(f"ERROR: {e}" for e in exc.errors), file=sys.stderr)
        return 1
    except (LookupError, TerrainError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
