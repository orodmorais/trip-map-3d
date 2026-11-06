import pytest

from pipeline.schema import TripError
from pipeline.surf import attach_spots, load_spots
from pipeline.tides import pick_stations

MAP = {"id": "map-1", "places": ["a"], "bbox": {"lat0": 20, "lat1": 22, "lon0": -159, "lon1": -157}}


def test_nearest_stations_skip_neighbors_on_top_of_each_other():
    stations = [{"id": "far", "lat": 30, "lng": -150}, {"id": "a", "lat": 21.0, "lng": -158.0},
                {"id": "b", "lat": 21.01, "lng": -158.0}, {"id": "c", "lat": 21.5, "lng": -158.0}]
    assert [s["id"] for s in pick_stations(stations, 21, -158)] == ["a", "c"]


def test_spot_at_a_trip_place_shares_its_pin():
    trip = {"places": [{"id": "a", "name": "A"}], "maps": [MAP]}
    merged, notes = attach_spots(trip, [{"id": "s_a", "place": "a", "name": "A", "lat": 21, "lon": -158}])
    assert merged["places"][0]["spot"]["id"] == "s_a" and len(merged["places"]) == 1 and notes == []


def test_other_spots_get_a_pin_on_the_map_that_contains_them():
    trip = {"places": [{"id": "a", "name": "A"}], "maps": [MAP]}
    merged, _ = attach_spots(trip, [{"id": "s_b", "name": "B", "lat": 21, "lon": -158}])
    assert merged["places"][1]["type"] == "spot" and "s-b" in merged["maps"][0]["places"]


def test_spots_outside_every_map_are_reported():
    trip = {"places": [], "maps": [MAP]}
    merged, notes = attach_spots(trip, [{"id": "x", "name": "Far", "lat": 40, "lon": 10}])
    assert merged["places"] == [] and "Far" in notes[0]


def test_incomplete_spot_files_are_refused(tmp_path):
    path = tmp_path / "spots.yaml"
    path.write_text("- {id: x, name: X}\n", encoding="utf-8")
    with pytest.raises(TripError):
        load_spots(path)
