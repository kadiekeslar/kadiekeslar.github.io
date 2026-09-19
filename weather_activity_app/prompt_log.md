I used ChatGPT with GPT-5.6 Sol to help me plan, build, debug, and improve this project.

My main prompt that got most of the core done was my initial prompt:

“i am working on a college assignment where i need to build a small interactive python app that uses at least one public api. i want to create a weather-based activity recommendation app, and i want you to build the complete project for me while also explaining the code clearly enough that i can understand it and explain how it works afterward.

the final project should run as a web app that i can open in a browser and interact with like a normal website. use a beginner-friendly python framework such as streamlit. i want to be able to run it locally in my browser while developing it, and i also want instructions for deploying it online so i can have a public link that someone else can open without installing python. streamlit community cloud or another simple free hosting option would be ideal.

the app should ask the user for their location using either a city or zip code, how far they are willing to travel such as 5, 10, 20, or 50 miles, what kind of activity they are interested in such as food, something fun, or either/surprise me, and whether they want an indoor activity, outdoor activity, or either.

after getting this information, the app should use the current weather and nearby places to give the user around 3 to 5 recommendations. each recommendation should include the name of the place, the type or category, the approximate distance from the user's location, whether it is indoor or outdoor, a short description if one is available, an explanation of why it is a good choice based on the current weather, and the address if available.

for example, a recommendation could say something like "carnegie science center, indoor activity, 4.2 miles away. since it is raining and 55°f outside, this is a good indoor option."

i want the interface to feel like a small real website instead of a python console program. the page should have a title such as "what should i do today?", a location input, a travel distance input or slider, an activity type selection, an indoor/outdoor/either selection, a button such as "find something to do", a section showing the current weather, and a section showing the recommendations. the recommendations should be displayed in a clean and readable way, such as cards or separate sections for each place. keep the design visually appealing but simple enough for a college api assignment.

please choose free apis or apis with a good free tier. ideally, use a weather and geocoding api that does not require exposing a secret api key. for nearby places and activities, use a free public api when possible. before using any api, verify that the endpoint and parameters actually exist in the api's current official documentation. do not invent api endpoints or parameters.

if an api key is required, do not hard-code it into the python file. store it securely using environment variables, streamlit secrets, or another appropriate method. explain exactly how i should set it up locally and when the app is deployed online. tell me exactly what should be added to .gitignore so i do not accidentally upload any secret keys to github.

build the entire working project at once and give me all of the code files i need. keep the code beginner-friendly and organized, but choose the structure and functions yourself based on what makes the most sense. do not overcomplicate the project with unnecessary files, classes, or advanced programming techniques.

the app needs good error handling because part of my assignment is testing ways the program might break. it should safely handle an empty location, a misspelled or nonexistent location, an invalid travel distance, no nearby activities being found, a weather api failure, a places api failure, no internet connection, and unexpected or missing data in an api response. instead of crashing or showing a long python error, the website should display a clear and friendly message to the user.

for every important api request used in the project, explain the endpoint, the http method, the query parameters being sent, what the api returns, what json means, and which fields from the json response the program actually uses. explain this in beginner-friendly language so i can describe how the api calls work during class or in my assignment.

after giving me the full project, walk me through the code in the same order that it runs. explain what happens when the user opens the website, enters a location, chooses their options, and clicks the recommendation button. explain how the program converts their location into coordinates, gets the current weather, finds nearby places, determines the distance, filters the results based on the user's choices, uses the weather to decide which activities are better choices, and displays the recommendations on the webpage.

also show me how to install every required python package and how to run the app locally from the terminal. include the exact commands i should use and explain how the streamlit app opens in the browser.

after that, give me step-by-step instructions for putting the project on github and deploying the app online so i receive a public website link that my professor or classmates can open. make sure the deployment instructions also explain how to securely add any api keys without uploading them to github.


finally, include a testing section where you give me several inputs i can try to prove that the error handling works, including normal inputs and unusual or invalid inputs.

give me the full finished project in one response. clearly separate the code files, setup instructions, api explanations, local run instructions, deployment instructions, testing instructions, and readme so it is easy for me to follow and copy into my project.”




To then get it to a finalized point here are some of the prompts I used to tweak:

- "Make the app accept a specific street address or location, not just a city or ZIP code."

- "Let the user enter any travel distance and add more activity categories like food, entertainment, outdoors, shopping, sports, attractions, and nightlife."

- "Fix the nearby places search because some locations are failing or taking too long to load."

- "Make the UI look cozy, professional, and welcoming without emojis or too much extra text."

- "Check whether my project meets the assignment requirements, especially the API and API security requirements."


I used the AI suggestions as a starting point, then tested the website, reported bugs, and made changes based on what was and was not working.

