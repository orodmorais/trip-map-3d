"""Command line: python -m pipeline check trip.yaml"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .geocode import DEFAULT_GEOCODER, load_lock, photon_searcher, resolve_places, save_lock, timezone_for
from .regions import assign_days, build_maps
from .schema import TripError, load_trip


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


def main() -> int:
    parser = argparse.ArgumentParser(prog="pipeline", description="Build a 3D trip map website.")
    parser.add_argument("command", choices=["check"])
    parser.add_argument("trip", type=Path)
    args = parser.parse_args()
    try:
        _, report = prepare(args.trip)
    except TripError as exc:
        print("\n".join(f"ERROR: {e}" for e in exc.errors), file=sys.stderr)
        return 1
    except LookupError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
