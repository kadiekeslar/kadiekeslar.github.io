What Should I Do Today?
This is a small weather based activity recommendation website. The user can enter an address, landmark, neighborhood, city, or ZIP code, choose how far they are willing to travel, pick an activity type, and choose whether they want something indoors or outdoors. The app checks the current weather and nearby places, then gives a list of recommendations that fit the user's choices and current weather.

Live site: https://kadiekeslar.github.io/weather_activity_app/

How the APIs work
The app uses JavaScript's fetch() function to call public APIs when the user searches. Nominatim is used to turn the location the user types into latitude and longitude coordinates using the q search parameter, with the U.S. Census Geocoder and Open-Meteo geocoding as fallbacks for some addresses, cities, and ZIP codes. The coordinates are sent to Open-Meteo's forecast endpoint with parameters such as latitude, longitude, and current to get the current temperature, feels-like temperature, precipitation, weather code, and wind speed. The app also sends the coordinates and a search radius to the OpenStreetMap Overpass API to find nearby places, and it can fall back to a bounded Nominatim place search if Overpass is unavailable. Most of the API responses are returned as JSON, which JavaScript reads as objects and arrays so the app can pull out fields such as coordinates, weather values, place names, categories, and addresses.

APIs I used
OpenStreetMap Nominatim – searches for locations and can also be used as a fallback for nearby places.

U.S. Census Geocoder – fallback for some U.S. street addresses.

Open-Meteo Geocoding API – fallback for city and ZIP/postal-code searches.

Open-Meteo Forecast API – gets the current weather.

OpenStreetMap Overpass API – finds nearby restaurants, parks, museums, stores, entertainment, and other places.

API security
This project does not use any private API keys, passwords, tokens, or other credentials. The APIs I chose can be used for this project without putting a secret key in the website, so there are no API secrets stored in this GitHub repository. The API endpoint URLs are visible in index.html, but those URLs are public and are not secret credentials.

If I changed the project in the future to use an API that requires a private key, I would not put that key directly in the JavaScript because anything in front-end code can be seen by people visiting the website. I would store the key outside the public repository and use a backend instead.

How the app works
The user enters a location and chooses a travel distance, activity type, and indoor/outdoor preference.

The app converts the location into latitude and longitude.

It uses those coordinates to get the current weather from Open-Meteo.

It searches OpenStreetMap for nearby places that match the activity type.

The app calculates the approximate straight-line distance to each place using the coordinates.

It filters and ranks the results using the user's choices, distance, and current weather.

The best recommendations are shown as cards with the place name, category, distance, setting, weather reason, address when available, and a map link.

Running the project
No Python packages or other libraries need to be installed because the project is written in HTML, CSS, and JavaScript.

The easiest way to use it is the live GitHub Pages version:

https://kadiekeslar.github.io/weather_activity_app/

To run it locally, open a terminal in the repository folder and start a simple local web server:

python3 -m http.server 8000
Then go to:

http://localhost:8000/weather_activity_app/
The main project file is:

weather_activity_app/index.html
Error handling / testing
I tested several situations that could cause the program to fail. The app checks for an empty location, locations that cannot be found, invalid travel distances, no matching nearby places, internet/API failures, and missing API data. Instead of showing a JavaScript error to the user, it displays a short message explaining what went wrong.

Some test cases I used:

A normal address such as 5000 Forbes Ave, Pittsburgh, PA

A city such as Pittsburgh, PA

A ZIP code such as 15213

A more rural street address

A blank location

A fake or misspelled location

Different travel distances

Indoor and outdoor filters

Turning off Wi-Fi before searching


Notes
The distance shown for recommendations is an approximate straight-line distance, not driving distance. Place information comes from OpenStreetMap, so some places have more complete names, addresses, or categories than others. Public API services can also occasionally be slow or temporarily unavailable, so the app includes fallbacks and error messages when possible.

