from math import asin, cos, radians, sin, sqrt


def parse_coordinate(value):
    if value in (None, ""):
        return None
    return float(value)


def validate_geofence(latitude, longitude, radius_meters):
    if latitude is None and longitude is None and radius_meters is None:
        return None
    if latitude is None or longitude is None or radius_meters is None:
        return "Latitude, longitude, and radius are required for location restricted attendance"
    if not -90 <= latitude <= 90:
        return "Latitude must be between -90 and 90"
    if not -180 <= longitude <= 180:
        return "Longitude must be between -180 and 180"
    if not 10 <= radius_meters <= 10000:
        return "Radius must be between 10 and 10000 meters"
    return None


def distance_in_meters(origin_latitude, origin_longitude, target_latitude, target_longitude):
    earth_radius_meters = 6371000
    origin_latitude = radians(origin_latitude)
    target_latitude = radians(target_latitude)
    latitude_delta = radians(target_latitude - origin_latitude)
    longitude_delta = radians(target_longitude - origin_longitude)

    haversine = (
        sin(latitude_delta / 2) ** 2
        + cos(origin_latitude) * cos(target_latitude) * sin(longitude_delta / 2) ** 2
    )
    return earth_radius_meters * 2 * asin(sqrt(haversine))


def permission_has_geofence(permission):
    return bool(
        permission
        and permission.latitude is not None
        and permission.longitude is not None
        and permission.radius_meters is not None
    )
