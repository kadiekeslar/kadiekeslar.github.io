# What Should I Do Today? 🌦️

A beginner-friendly Streamlit web app that recommends nearby activities based on a user's location, travel distance, activity preference, indoor/outdoor preference, and current weather.

The project is designed for a college API assignment. It uses real public APIs, displays friendly errors instead of raw Python tracebacks, and can run locally or be deployed publicly with Streamlit Community Cloud.

## Features

- Enter a **city or ZIP/postal code**.
- Choose a travel radius of **5, 10, 20, or 50 miles**.
- Choose **Food**, **Something fun**, or **Surprise me**.
- Choose **Indoor**, **Outdoor**, or **Either**.
- View the current temperature, feels-like temperature, wind, precipitation, and weather condition.
- Get up to five nearby recommendations with:
  - place name
  - category
  - approximate distance
  - indoor/outdoor classification
  - short description
  - weather-based reason
  - address when OpenStreetMap has one
- Friendly handling for missing input, unknown locations, API failures, no internet, no nearby results, and unexpected API data.

## Project files

```text
weather_activity_app/
├── app.py
├── requirements.txt
├── .gitignore
└── README.md
```

## APIs used

This version does **not require an API key**.

### 1. Open-Meteo Geocoding API

**Purpose:** Converts the user's city or ZIP/postal code into latitude and longitude.

**Endpoint:**

```text
https://geocoding-api.open-meteo.com/v1/search
```

**HTTP method:** `GET`

**Query parameters sent by the app:**

- `name`: the city or postal code typed by the user
- `count=1`: ask for the best single match
- `language=en`: return English names when available
- `format=json`: return the response as JSON

Example request conceptually looks like:

```text
GET /v1/search?name=Pittsburgh%2C+PA&count=1&language=en&format=json
```

Important response fields used by `app.py`:

- `results[0].latitude`
- `results[0].longitude`
- `results[0].name`
- `results[0].admin1`
- `results[0].country`

If `results` is missing or empty, the app tells the user that the location could not be found.

### 2. Open-Meteo Forecast API

**Purpose:** Gets the current weather for the latitude and longitude found by the geocoding request.

**Endpoint:**

```text
https://api.open-meteo.com/v1/forecast
```

**HTTP method:** `GET`

**Important query parameters sent by the app:**

- `latitude`: location latitude
- `longitude`: location longitude
- `current`: asks for specific current-weather variables
- `temperature_unit=fahrenheit`
- `wind_speed_unit=mph`
- `precipitation_unit=inch`
- `timezone=auto`

The `current` parameter requests:

```text
temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day
```

Important response fields used by `app.py`:

- `current.temperature_2m`
- `current.apparent_temperature`
- `current.precipitation`
- `current.weather_code`
- `current.wind_speed_10m`
- `current.is_day`
- `current.time`

The numeric weather code is converted into text such as `Clear sky`, `Rain`, `Snow`, or `Thunderstorm` using the `WEATHER_CODES` dictionary in the program.

### 3. OpenStreetMap Overpass API

**Purpose:** Finds restaurants, cafes, entertainment, museums, parks, and other activities near the user's coordinates.

**Endpoint:**

```text
https://overpass-api.de/api/interpreter
```

**HTTP method:** `POST`

The POST body contains one form field named `data`. Its value is an **Overpass QL query**. The query uses the documented `around` filter to search within a radius in meters around the latitude and longitude.

The app searches OpenStreetMap tags such as:

- `amenity=restaurant`
- `amenity=cafe`
- `amenity=cinema`
- `leisure=bowling_alley`
- `leisure=park`
- `tourism=museum`
- `tourism=gallery`
- `tourism=viewpoint`
- `tourism=zoo`

The query ends with:

```text
out center 800;
```

With the default output mode, OpenStreetMap tags are included. `center` also adds a center coordinate for ways and relations, which lets the app calculate distance even when a place is represented by an area instead of a single point. The `800` limit prevents an unnecessarily large public-server response for a large search radius.

Important response fields used by `app.py`:

- `elements`
- each element's `lat` and `lon`, or `center.lat` and `center.lon`
- `tags.name`
- `tags.amenity`
- `tags.leisure`
- `tags.tourism`
- `tags.description`
- `tags.cuisine`
- `tags.indoor`
- `tags.outdoor_seating`
- common `tags.addr:*` address fields

Place data comes from OpenStreetMap contributors, so some locations may have more complete descriptions or addresses than others.

## What JSON means

**JSON** stands for **JavaScript Object Notation**. It is a common text format APIs use to send structured data.

A simplified weather JSON response might look like this:

```json
{
  "latitude": 40.44,
  "longitude": -79.99,
  "current": {
    "temperature_2m": 55.0,
    "apparent_temperature": 53.2,
    "precipitation": 0.04,
    "weather_code": 61,
    "wind_speed_10m": 8.0
  }
}
```

Python's `requests` library turns that JSON into normal Python dictionaries and lists when the program calls:

```python
data = response.json()
```

Then the program can read a value such as:

```python
temperature = data["current"]["temperature_2m"]
```

## How the program runs, in order

### 1. The page loads

Streamlit runs `app.py` from top to bottom. It sets the page title, defines constants, defines helper functions, adds a small amount of CSS, and displays the form.

Nothing is sent to an API until the user clicks **Find something to do**.

### 2. The user fills out the form

The user enters a location and chooses:

- travel distance
- activity type
- indoor/outdoor preference

The distance widget only offers 5, 10, 20, or 50 miles, which prevents most invalid-distance input before it reaches the API logic. The backend checks the value again as a second layer of validation.

### 3. The location is converted to coordinates

`geocode_location()` sends the text to the Open-Meteo Geocoding API.

For example, `Pittsburgh, PA` may resolve to coordinates around latitude `40.44` and longitude `-80.00`.

Latitude and longitude are numbers that identify a position on Earth. The program needs them because both the weather request and the nearby-place search work from coordinates.

### 4. Current weather is requested

`get_current_weather()` sends the coordinates to Open-Meteo's forecast endpoint and asks only for the current fields the app actually needs.

The function checks that the response contains a `current` object and that required fields are present. If the data is incomplete, the function raises a friendly app-specific error instead of allowing a `KeyError` or another traceback to appear on the webpage.

### 5. Nearby places are requested

`get_nearby_places()` converts miles to meters because the Overpass `around` filter uses meters.

For example:

```text
10 miles × 1609.344 = about 16,093 meters
```

`build_overpass_query()` creates a query based on the activity type. Food searches restaurant-style tags. Something fun searches entertainment, leisure, and tourism tags. Surprise me searches both groups.

### 6. Distance is calculated

The Overpass response gives coordinates for each candidate place. The app uses `haversine_miles()` to calculate the approximate straight-line distance between the user's coordinates and each place.

This is **not driving distance**. It is a geographic estimate, which keeps the project free and avoids needing a separate routing API.

### 7. Places are cleaned and classified

The program:

- skips entries with missing names or coordinates
- removes obvious duplicate names/categories
- identifies a readable category
- creates a short description
- builds an address when OpenStreetMap address tags are available
- classifies the place as `Indoor`, `Outdoor`, or `Indoor / outdoor`

The classification uses explicit OSM tags when they exist. When they do not, it uses simple defaults. For example, a museum is normally treated as indoor and a park is normally treated as outdoor. A general attraction may be classified as `Indoor / outdoor` because the source data does not always say which one it is.

### 8. The user's indoor/outdoor choice is applied

`environment_matches()` keeps only places that match the user's selection. A place marked `Indoor / outdoor` can satisfy either an indoor or an outdoor request.

### 9. Weather affects the ranking

`recommendation_score()` gives each candidate a score.

The score considers:

- distance — closer places get a higher score
- the user's indoor/outdoor preference
- current weather

Rain, snow, fog, extreme temperature, or strong wind favors indoor options. Mild, dry, relatively calm weather favors outdoor options.

This is a simple rules-based recommendation system, not artificial intelligence or machine learning.

### 10. Results are displayed

The app shows current weather in Streamlit metric boxes and then displays each recommendation in its own bordered card with the place details and a sentence explaining why the current weather makes it a reasonable choice.

## Error handling

The program is designed not to show users a long Python traceback during normal failures.

It handles:

- **Empty location:** shows a warning before calling an API.
- **Misspelled/nonexistent location:** detects an empty geocoding result and asks the user to check the spelling.
- **Invalid travel distance:** the UI restricts choices and the places function validates the value again.
- **No nearby activities:** shows an informational message suggesting a larger radius or different filter.
- **Weather API failure:** catches connection, timeout, HTTP, JSON, and missing-data problems and displays a friendly weather error.
- **Places API failure:** catches connection, timeout, HTTP, JSON, and missing-data problems and displays a friendly places error.
- **No internet connection:** `requests.ConnectionError` is caught for each API.
- **Unexpected/missing API data:** the code checks types and required fields before using them.

## Install and run locally

Python 3.11 or 3.12 is a good choice for this project.

Open Terminal (macOS/Linux) or PowerShell/Command Prompt (Windows), move into the project folder, and create a virtual environment.

### macOS / Linux

```bash
cd weather_activity_app
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
streamlit run app.py
```

### Windows PowerShell

```powershell
cd weather_activity_app
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
streamlit run app.py
```

If `streamlit run app.py` is not recognized, use:

```bash
python -m streamlit run app.py
```

Streamlit starts a small local web server and normally opens the app automatically in your default browser. The terminal will also show a local address, usually similar to:

```text
http://localhost:8501
```

Keep the terminal window running while you use the app. Press `Ctrl+C` in the terminal to stop it.

## API keys and secrets

**No API key is required for this project**, so there is no secret you need to create locally or in Streamlit Community Cloud.

The `.gitignore` still includes:

```text
.env
.env.*
.streamlit/secrets.toml
```

That means if you later switch to an API that requires a key, you can store it in an environment file or Streamlit secrets file without accidentally uploading it to GitHub.

If a future version uses Streamlit secrets, a local file would typically be placed at:

```text
.streamlit/secrets.toml
```

For deployment, the contents would be copied into the **Secrets** field in the app's Streamlit Community Cloud settings rather than committed to GitHub.

## Put the project on GitHub

Create a new empty GitHub repository, for example `weather-activity-app`. Do not add another README from GitHub if you are uploading this project as-is because this folder already contains one.

From the local project folder, run:

```bash
git init
git add .
git commit -m "Initial weather activity app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/weather-activity-app.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

Before pushing, you can verify that ignored secret files are not being tracked with:

```bash
git status
```

## Deploy on Streamlit Community Cloud

1. Make sure the project is pushed to GitHub.
2. Go to `https://share.streamlit.io/` and sign in with GitHub.
3. Click **Create app**.
4. Choose **Yup, I have an app**.
5. Select your GitHub repository and the `main` branch.
6. Set the entrypoint file to `app.py`.
7. Optionally choose a custom `streamlit.app` subdomain.
8. In **Advanced settings**, you can select the same Python version you used locally. No secrets are needed for this project.
9. Click **Deploy**.
10. When deployment finishes, Streamlit gives you a public URL ending in `.streamlit.app` that you can send to your professor or classmates.

Streamlit Community Cloud reads `requirements.txt` and installs the needed Python packages automatically.

If you later add a secret API key, do **not** put the key in `app.py` and do **not** push `.streamlit/secrets.toml`. Put the secret in Streamlit Community Cloud's **Advanced settings / Secrets** field instead.

## Manual testing ideas

Try these cases and record what happens for your assignment.

| Test | Example input | Expected result |
|---|---|---|
| Normal city | `Pittsburgh, PA`, 10 miles, Something fun, Either | Weather plus several recommendations |
| ZIP/postal code | `15213`, 5 miles, Food, Indoor | Resolves the ZIP and returns nearby food when available |
| Outdoor preference | `Pittsburgh, PA`, 10 miles, Something fun, Outdoor | Parks/viewpoints/outdoor attractions are favored when found |
| Empty location | leave location blank | Friendly warning; no API request is made |
| Nonsense location | `zzzz-not-a-real-city-99999` | Friendly “could not find that location” message |
| Very remote area | try a recognized remote location with a 5-mile radius | May show “no matching places” instead of crashing |
| No internet | disconnect Wi-Fi, then search | Friendly connection error instead of a traceback |
| Slow/failed places service | try again later if Overpass is busy, or temporarily change `OVERPASS_URL` to an invalid domain while testing | Friendly places-service error |
| Failed weather service | temporarily change `WEATHER_URL` to an invalid domain while testing | Friendly weather-service error; page remains usable |
| Unexpected API data | temporarily change a required JSON field name in `get_current_weather()` while testing | Friendly incomplete/unexpected-data error |
| Invalid distance backend check | temporarily call `get_nearby_places(..., 7, ...)` from code | `PlacesAPIError` is raised with a clear message |

When you finish fault testing, restore the real API URLs before submitting or deploying.

## Notes and limitations

- Distances are straight-line estimates rather than driving distances.
- OpenStreetMap is community-maintained, so a place may be missing an address, description, or indoor/outdoor tag.
- The app makes a best-effort indoor/outdoor classification when OSM does not explicitly provide one.
- The public Overpass API can occasionally be busy or rate-limited. The app catches those failures and asks the user to retry.
- The 50-mile option can include many places, so the Overpass response is capped at 800 candidate elements before the app filters and ranks them.
- This project is intended for normal classroom/demo usage, not high-volume commercial traffic.

## Credits

- Weather and geocoding: **Open-Meteo**
- Place data: **© OpenStreetMap contributors**
- Nearby-place query service: **Overpass API**
- Web interface: **Streamlit**
