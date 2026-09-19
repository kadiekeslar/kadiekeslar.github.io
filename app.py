import math
from typing import Any

import requests
import streamlit as st


# -----------------------------
# App configuration
# -----------------------------
st.set_page_config(
    page_title="What Should I Do Today?",
    page_icon="🌦️",
    layout="centered",
)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

MILES_TO_METERS = 1609.344
EARTH_RADIUS_MILES = 3958.8

REQUEST_HEADERS = {
    "User-Agent": "weather-activity-recommender-college-project/1.0"
}


# -----------------------------
# Friendly app-specific errors
# -----------------------------
class LocationNotFoundError(Exception):
    """Raised when the geocoding API cannot find the user's location."""


class WeatherAPIError(Exception):
    """Raised when current weather cannot be retrieved or understood."""


class PlacesAPIError(Exception):
    """Raised when nearby place data cannot be retrieved or understood."""


# -----------------------------
# Small display helpers
# -----------------------------
WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Light freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light rain showers",
    81: "Rain showers",
    82: "Heavy rain showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with light hail",
    99: "Thunderstorm with heavy hail",
}

CATEGORY_NAMES = {
    "restaurant": "Restaurant",
    "cafe": "Cafe",
    "fast_food": "Fast food",
    "food_court": "Food court",
    "ice_cream": "Ice cream shop",
    "cinema": "Movie theater",
    "theatre": "Theater",
    "arts_centre": "Arts center",
    "community_centre": "Community center",
    "library": "Library",
    "bowling_alley": "Bowling alley",
    "amusement_arcade": "Arcade",
    "fitness_centre": "Fitness center",
    "sports_centre": "Sports center",
    "escape_game": "Escape room",
    "park": "Park",
    "garden": "Garden",
    "nature_reserve": "Nature reserve",
    "playground": "Playground",
    "dog_park": "Dog park",
    "miniature_golf": "Mini golf",
    "golf_course": "Golf course",
    "museum": "Museum",
    "gallery": "Gallery",
    "viewpoint": "Viewpoint",
    "zoo": "Zoo",
    "theme_park": "Theme park",
    "attraction": "Attraction",
}

INDOOR_DEFAULTS = {
    "restaurant",
    "cafe",
    "fast_food",
    "food_court",
    "ice_cream",
    "cinema",
    "theatre",
    "arts_centre",
    "community_centre",
    "library",
    "bowling_alley",
    "amusement_arcade",
    "fitness_centre",
    "museum",
    "gallery",
    "escape_game",
}

OUTDOOR_DEFAULTS = {
    "park",
    "garden",
    "nature_reserve",
    "playground",
    "dog_park",
    "miniature_golf",
    "golf_course",
    "viewpoint",
    "zoo",
    "theme_park",
}


# -----------------------------
# API functions
# -----------------------------
@st.cache_data(ttl=3600, show_spinner=False)
def geocode_location(location_text: str) -> dict[str, Any]:
    """Convert a city or postal code into latitude/longitude with Open-Meteo."""
    location_text = location_text.strip()
    if not location_text:
        raise LocationNotFoundError("Please enter a city or ZIP/postal code.")

    params = {
        "name": location_text,
        "count": 1,
        "language": "en",
        "format": "json",
    }

    try:
        response = requests.get(
            GEOCODING_URL,
            params=params,
            headers=REQUEST_HEADERS,
            timeout=(5, 12),
        )
        response.raise_for_status()
        data = response.json()
    except requests.ConnectionError as exc:
        raise LocationNotFoundError(
            "I could not reach the location service. Check your internet connection and try again."
        ) from exc
    except (requests.Timeout, requests.RequestException, ValueError) as exc:
        raise LocationNotFoundError(
            "The location service is unavailable right now. Please try again in a moment."
        ) from exc

    results = data.get("results") if isinstance(data, dict) else None
    if not results:
        raise LocationNotFoundError(
            "I could not find that location. Check the spelling or try adding a state/country."
        )

    result = results[0]
    latitude = result.get("latitude")
    longitude = result.get("longitude")
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        raise LocationNotFoundError(
            "The location service returned incomplete coordinates. Please try another location."
        )

    display_parts = [result.get("name"), result.get("admin1"), result.get("country")]
    display_name = ", ".join(str(part) for part in display_parts if part)

    return {
        "latitude": float(latitude),
        "longitude": float(longitude),
        "display_name": display_name or location_text,
    }


@st.cache_data(ttl=600, show_spinner=False)
def get_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    """Get current weather from Open-Meteo."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,apparent_temperature,precipitation,"
            "weather_code,wind_speed_10m,is_day"
        ),
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "timezone": "auto",
    }

    try:
        response = requests.get(
            WEATHER_URL,
            params=params,
            headers=REQUEST_HEADERS,
            timeout=(5, 12),
        )
        response.raise_for_status()
        data = response.json()
    except requests.ConnectionError as exc:
        raise WeatherAPIError(
            "I could not reach the weather service. Check your internet connection and try again."
        ) from exc
    except requests.Timeout as exc:
        raise WeatherAPIError(
            "The weather service took too long to respond. Please try again."
        ) from exc
    except (requests.RequestException, ValueError) as exc:
        raise WeatherAPIError(
            "The weather service is unavailable right now. Please try again in a moment."
        ) from exc

    current = data.get("current") if isinstance(data, dict) else None
    if not isinstance(current, dict):
        raise WeatherAPIError(
            "The weather service returned unexpected data. Please try again later."
        )

    required = ["temperature_2m", "weather_code", "precipitation", "wind_speed_10m"]
    if any(current.get(field) is None for field in required):
        raise WeatherAPIError(
            "The weather service returned incomplete current conditions. Please try again later."
        )

    try:
        temperature = float(current["temperature_2m"])
        apparent_temperature = float(current.get("apparent_temperature", temperature))
        precipitation = float(current["precipitation"])
        weather_code = int(current["weather_code"])
        wind_speed = float(current["wind_speed_10m"])
    except (TypeError, ValueError) as exc:
        raise WeatherAPIError(
            "The weather service returned values in an unexpected format."
        ) from exc

    return {
        "temperature": temperature,
        "feels_like": apparent_temperature,
        "precipitation": precipitation,
        "weather_code": weather_code,
        "condition": WEATHER_CODES.get(weather_code, "Current conditions"),
        "wind_speed": wind_speed,
        "is_day": current.get("is_day"),
        "time": current.get("time", ""),
    }


def build_overpass_query(
    latitude: float,
    longitude: float,
    radius_meters: int,
    activity_type: str,
) -> str:
    """Build the documented Overpass QL query used to find candidate places."""
    if activity_type == "Food":
        clauses = [
            'nwr(around:{r},{lat},{lon})["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]["name"];'
        ]
    elif activity_type == "Something fun":
        clauses = [
            'nwr(around:{r},{lat},{lon})["amenity"~"^(cinema|theatre|arts_centre|community_centre|library)$"]["name"];',
            'nwr(around:{r},{lat},{lon})["leisure"~"^(bowling_alley|amusement_arcade|fitness_centre|sports_centre|escape_game|park|garden|nature_reserve|playground|dog_park|miniature_golf|golf_course)$"]["name"];',
            'nwr(around:{r},{lat},{lon})["tourism"~"^(museum|gallery|viewpoint|zoo|theme_park|attraction)$"]["name"];',
        ]
    else:  # Surprise me / either food or fun
        clauses = [
            'nwr(around:{r},{lat},{lon})["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|cinema|theatre|arts_centre|community_centre|library)$"]["name"];',
            'nwr(around:{r},{lat},{lon})["leisure"~"^(bowling_alley|amusement_arcade|fitness_centre|sports_centre|escape_game|park|garden|nature_reserve|playground|dog_park|miniature_golf|golf_course)$"]["name"];',
            'nwr(around:{r},{lat},{lon})["tourism"~"^(museum|gallery|viewpoint|zoo|theme_park|attraction)$"]["name"];',
        ]

    formatted = "\n".join(
        clause.format(
            r=radius_meters,
            lat=f"{latitude:.6f}",
            lon=f"{longitude:.6f}",
        )
        for clause in clauses
    )

    # Default body output includes tags; "center" also adds a center coordinate for ways/relations.
    # The 800-item limit protects the public Overpass server from an unnecessarily
    # large response when a user selects a 50-mile radius in a dense city.
    return f"""[out:json][timeout:25];
(
{formatted}
);
out center 800;
"""


@st.cache_data(ttl=900, show_spinner=False)
def get_nearby_places(
    latitude: float,
    longitude: float,
    radius_miles: int,
    activity_type: str,
) -> list[dict[str, Any]]:
    """Find nearby OpenStreetMap places using the public Overpass API."""
    if radius_miles not in {5, 10, 20, 50}:
        raise PlacesAPIError("Please choose a travel distance of 5, 10, 20, or 50 miles.")

    radius_meters = int(radius_miles * MILES_TO_METERS)
    query = build_overpass_query(latitude, longitude, radius_meters, activity_type)

    try:
        response = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers=REQUEST_HEADERS,
            timeout=(8, 35),
        )
        response.raise_for_status()
        data = response.json()
    except requests.ConnectionError as exc:
        raise PlacesAPIError(
            "I could not reach the nearby-places service. Check your internet connection and try again."
        ) from exc
    except requests.Timeout as exc:
        raise PlacesAPIError(
            "The nearby-places search took too long. Try a smaller travel distance or try again later."
        ) from exc
    except (requests.RequestException, ValueError) as exc:
        raise PlacesAPIError(
            "The nearby-places service is unavailable right now. Please try again in a moment."
        ) from exc

    elements = data.get("elements") if isinstance(data, dict) else None
    if not isinstance(elements, list):
        raise PlacesAPIError(
            "The nearby-places service returned unexpected data. Please try again later."
        )

    places = []
    for element in elements:
        if not isinstance(element, dict):
            continue

        tags = element.get("tags") or {}
        if not isinstance(tags, dict):
            continue

        name = tags.get("name")
        if not name:
            continue

        place_lat = element.get("lat")
        place_lon = element.get("lon")
        center = element.get("center")
        if (place_lat is None or place_lon is None) and isinstance(center, dict):
            place_lat = center.get("lat")
            place_lon = center.get("lon")

        if not isinstance(place_lat, (int, float)) or not isinstance(place_lon, (int, float)):
            continue

        distance = haversine_miles(latitude, longitude, float(place_lat), float(place_lon))
        if distance > radius_miles:
            continue

        category_key = get_category_key(tags)
        if not category_key:
            continue

        place = {
            "name": str(name),
            "category_key": category_key,
            "category": CATEGORY_NAMES.get(category_key, category_key.replace("_", " ").title()),
            "environment": classify_environment(tags, category_key),
            "description": build_description(tags, category_key),
            "address": build_address(tags),
            "distance": distance,
            "latitude": float(place_lat),
            "longitude": float(place_lon),
            "tags": tags,
        }
        places.append(place)

    return deduplicate_places(places)


# -----------------------------
# Place-processing functions
# -----------------------------
def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate straight-line distance between two latitude/longitude points."""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_MILES * c


def get_category_key(tags: dict[str, Any]) -> str | None:
    """Pick the OSM tag value that best describes the place."""
    for key in ("amenity", "leisure", "tourism"):
        value = tags.get(key)
        if value in CATEGORY_NAMES:
            return str(value)
    return None


def classify_environment(tags: dict[str, Any], category_key: str) -> str:
    """Classify a place as Indoor, Outdoor, or Indoor / outdoor."""
    indoor_tag = str(tags.get("indoor", "")).lower()
    outdoor_seating = str(tags.get("outdoor_seating", "")).lower()

    if indoor_tag == "yes":
        return "Indoor"
    if indoor_tag == "no":
        return "Outdoor"

    if category_key in {"restaurant", "cafe", "fast_food", "food_court", "ice_cream"}:
        if outdoor_seating == "only":
            return "Outdoor"
        if outdoor_seating == "yes":
            return "Indoor / outdoor"
        return "Indoor"

    if category_key in INDOOR_DEFAULTS:
        return "Indoor"
    if category_key in OUTDOOR_DEFAULTS:
        return "Outdoor"

    # Some categories, such as a general attraction or sports center, may be
    # indoors, outdoors, or a mix. We do not pretend the API tells us more than it does.
    return "Indoor / outdoor"


def build_description(tags: dict[str, Any], category_key: str) -> str:
    """Use an OSM description when available, otherwise make a simple fallback."""
    description = tags.get("description")
    if description:
        text = str(description).strip()
        return text if len(text) <= 180 else text[:177].rstrip() + "..."

    cuisine = tags.get("cuisine")
    if cuisine:
        cuisines = str(cuisine).replace(";", ", ").replace("_", " ")
        return f"Food option with cuisine listed as {cuisines}."

    fallback = {
        "restaurant": "A nearby restaurant found in OpenStreetMap.",
        "cafe": "A nearby cafe for coffee, drinks, or a casual bite.",
        "fast_food": "A nearby quick-service food option.",
        "food_court": "A nearby food court with multiple food choices.",
        "ice_cream": "A nearby spot for ice cream or a sweet treat.",
        "cinema": "A nearby place to see a movie.",
        "theatre": "A nearby venue for performances or shows.",
        "arts_centre": "A nearby arts and culture venue.",
        "community_centre": "A nearby community activity venue.",
        "library": "A nearby library for a quiet indoor activity.",
        "bowling_alley": "A nearby place to go bowling.",
        "amusement_arcade": "A nearby arcade or game venue.",
        "fitness_centre": "A nearby fitness or recreation facility.",
        "sports_centre": "A nearby sports and recreation facility.",
        "escape_game": "A nearby escape-room style activity.",
        "park": "A nearby park for walking, relaxing, or spending time outside.",
        "garden": "A nearby garden or landscaped outdoor area.",
        "nature_reserve": "A nearby natural area for an outdoor visit.",
        "playground": "A nearby outdoor recreation area.",
        "dog_park": "A nearby outdoor dog park.",
        "miniature_golf": "A nearby miniature golf activity.",
        "golf_course": "A nearby golf course.",
        "museum": "A nearby museum to explore exhibits and collections.",
        "gallery": "A nearby gallery featuring art or exhibits.",
        "viewpoint": "A nearby viewpoint or scenic stop.",
        "zoo": "A nearby zoo or animal attraction.",
        "theme_park": "A nearby amusement or theme park.",
        "attraction": "A nearby attraction listed in OpenStreetMap.",
    }
    return fallback.get(category_key, "A nearby place that matches your activity choices.")


def build_address(tags: dict[str, Any]) -> str | None:
    """Build a readable address from common OpenStreetMap address tags."""
    if tags.get("addr:full"):
        return str(tags["addr:full"])

    street_line = " ".join(
        str(part)
        for part in (tags.get("addr:housenumber"), tags.get("addr:street"))
        if part
    ).strip()

    locality_parts = [
        tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village"),
        tags.get("addr:state"),
        tags.get("addr:postcode"),
    ]
    locality = ", ".join(str(part) for part in locality_parts if part)

    parts = [part for part in (street_line, locality) if part]
    return ", ".join(parts) if parts else None


def deduplicate_places(places: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove obvious duplicates, keeping the closest copy of each name/category."""
    unique: dict[tuple[str, str], dict[str, Any]] = {}
    for place in sorted(places, key=lambda item: item["distance"]):
        key = (place["name"].strip().lower(), place["category_key"])
        if key not in unique:
            unique[key] = place
    return list(unique.values())


def environment_matches(place_environment: str, preference: str) -> bool:
    if preference == "Either":
        return True
    if place_environment == "Indoor / outdoor":
        return True
    return place_environment == preference


# -----------------------------
# Recommendation logic
# -----------------------------
def weather_is_inclement(weather: dict[str, Any]) -> bool:
    code = weather["weather_code"]
    return (
        weather["precipitation"] > 0
        or code >= 45
        or weather["temperature"] < 40
        or weather["temperature"] > 90
        or weather["wind_speed"] >= 25
    )


def weather_is_outdoor_friendly(weather: dict[str, Any]) -> bool:
    return (
        50 <= weather["temperature"] <= 85
        and weather["precipitation"] == 0
        and weather["weather_code"] <= 3
        and weather["wind_speed"] < 20
    )


def recommendation_score(
    place: dict[str, Any],
    weather: dict[str, Any],
    radius_miles: int,
    environment_preference: str,
) -> float:
    """Give each candidate a simple score so the best matches appear first."""
    distance_score = max(0.0, 5.0 - (place["distance"] / radius_miles) * 5.0)
    score = distance_score

    if environment_preference != "Either" and environment_matches(
        place["environment"], environment_preference
    ):
        score += 3.0

    if weather_is_inclement(weather):
        if place["environment"] in {"Indoor", "Indoor / outdoor"}:
            score += 4.0
        else:
            score -= 2.0
    elif weather_is_outdoor_friendly(weather):
        if place["environment"] in {"Outdoor", "Indoor / outdoor"}:
            score += 4.0
        else:
            score += 1.0
    else:
        if place["environment"] == "Indoor / outdoor":
            score += 2.0
        else:
            score += 1.0

    return score


def weather_reason(place: dict[str, Any], weather: dict[str, Any]) -> str:
    temp = round(weather["temperature"])
    condition = weather["condition"].lower()

    if weather_is_inclement(weather):
        if place["environment"] in {"Indoor", "Indoor / outdoor"}:
            return (
                f"Since it is {condition} and about {temp}°F, this gives you an option "
                "that can keep you mostly or completely out of the weather."
            )
        return (
            f"You asked for an outdoor option. It is {condition} and about {temp}°F, "
            "so check conditions and dress appropriately before you go."
        )

    if weather_is_outdoor_friendly(weather):
        if place["environment"] in {"Outdoor", "Indoor / outdoor"}:
            return (
                f"It is {condition} and about {temp}°F with no current precipitation, "
                "so this is a good weather match for spending time outside."
            )
        return (
            f"It is {condition} and about {temp}°F. This is still a solid nearby choice "
            "if you would rather stay indoors."
        )

    return (
        f"Current conditions are {condition} at about {temp}°F. This option matches your "
        "activity preferences without relying on perfect outdoor weather."
    )


def choose_recommendations(
    places: list[dict[str, Any]],
    weather: dict[str, Any],
    radius_miles: int,
    environment_preference: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    filtered = [
        place
        for place in places
        if environment_matches(place["environment"], environment_preference)
    ]

    ranked = sorted(
        filtered,
        key=lambda place: recommendation_score(
            place, weather, radius_miles, environment_preference
        ),
        reverse=True,
    )

    recommendations = []
    for place in ranked[:limit]:
        copy = dict(place)
        copy["weather_reason"] = weather_reason(place, weather)
        recommendations.append(copy)
    return recommendations


# -----------------------------
# Streamlit page
# -----------------------------
st.markdown(
    """
    <style>
        .block-container {max-width: 900px; padding-top: 2rem; padding-bottom: 3rem;}
        .small-muted {color: #6b7280; font-size: 0.93rem;}
        div[data-testid="stMetric"] {
            background: rgba(128, 128, 128, 0.07);
            border-radius: 12px;
            padding: 10px 14px;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("🌦️ What Should I Do Today?")
st.write(
    "Enter where you are and what you feel like doing. The app checks current weather "
    "and nearby OpenStreetMap places, then recommends a few options."
)

with st.form("activity_form"):
    location_text = st.text_input(
        "City or ZIP/postal code",
        placeholder="Example: Pittsburgh, PA or 15213",
    )

    travel_miles = st.select_slider(
        "How far are you willing to travel?",
        options=[5, 10, 20, 50],
        value=10,
        format_func=lambda miles: f"{miles} miles",
    )

    activity_type = st.radio(
        "What kind of activity do you want?",
        ["Food", "Something fun", "Surprise me"],
        horizontal=True,
    )

    environment_preference = st.radio(
        "Indoor or outdoor?",
        ["Indoor", "Outdoor", "Either"],
        horizontal=True,
        index=2,
    )

    submitted = st.form_submit_button(
        "Find something to do",
        type="primary",
        use_container_width=True,
    )

if submitted:
    if not location_text.strip():
        st.warning("Please enter a city or ZIP/postal code before searching.")
    elif travel_miles not in {5, 10, 20, 50}:
        st.warning("Please choose a travel distance of 5, 10, 20, or 50 miles.")
    else:
        try:
            with st.spinner("Finding your location..."):
                location = geocode_location(location_text)
        except LocationNotFoundError as exc:
            st.error(str(exc))
        else:
            st.success(f"Location found: **{location['display_name']}**")

            weather = None
            places = None

            try:
                with st.spinner("Checking the current weather..."):
                    weather = get_current_weather(
                        location["latitude"], location["longitude"]
                    )
            except WeatherAPIError as exc:
                st.error(f"Weather problem: {exc}")

            try:
                with st.spinner("Searching for nearby places..."):
                    places = get_nearby_places(
                        location["latitude"],
                        location["longitude"],
                        travel_miles,
                        activity_type,
                    )
            except PlacesAPIError as exc:
                st.error(f"Places problem: {exc}")

            if weather:
                st.subheader("Current weather")
                weather_cols = st.columns(4)
                weather_cols[0].metric("Temperature", f"{weather['temperature']:.0f}°F")
                weather_cols[1].metric("Feels like", f"{weather['feels_like']:.0f}°F")
                weather_cols[2].metric("Wind", f"{weather['wind_speed']:.0f} mph")
                weather_cols[3].metric("Precipitation", f"{weather['precipitation']:.2f} in")
                st.caption(
                    f"Conditions: {weather['condition']}"
                    + (f" • Weather time: {weather['time']}" if weather.get("time") else "")
                )

            if places is not None and not places:
                st.info(
                    "I did not find any matching places in that radius. Try a larger distance, "
                    "choose ‘Either,’ or try a nearby larger city."
                )

            if weather and places:
                recommendations = choose_recommendations(
                    places,
                    weather,
                    travel_miles,
                    environment_preference,
                    limit=5,
                )

                st.subheader("Recommendations")
                if not recommendations:
                    st.info(
                        "I found nearby places, but none matched your indoor/outdoor choice. "
                        "Try selecting ‘Either’ or changing the activity type."
                    )
                else:
                    st.caption(
                        "Distances are approximate straight-line distances, not driving distances."
                    )
                    for index, place in enumerate(recommendations, start=1):
                        with st.container(border=True):
                            st.markdown(f"### {index}. {place['name']}")
                            st.write(
                                f"**{place['category']}** • **{place['environment']}** • "
                                f"**{place['distance']:.1f} miles away**"
                            )
                            st.write(place["description"])
                            st.info(place["weather_reason"])
                            if place["address"]:
                                st.write(f"📍 **Address:** {place['address']}")
                            else:
                                st.write("📍 **Address:** Not listed in OpenStreetMap")

st.divider()
st.caption(
    "Weather and geocoding: Open-Meteo. Place data: © OpenStreetMap contributors, "
    "queried through the Overpass API."
)
