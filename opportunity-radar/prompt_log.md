OpenAI Codex (the GPT-6-family coding agent in the Codex desktop app) assisted with architecture, implementation, debugging, tests, browser checks, and AI-labeled technical documentation. The exact selectable model variant is not exposed in this conversation, so no more specific variant is claimed. Tools included the terminal, Git, official web documentation search, and browser UI verification. The student used Codex to turn a detailed product idea into an implementation; the student must add their own explanation of why they selected these tools before submission.


```text
I want to build a real live website called Opportunity Radar. It is a job/internship discovery, recommendation, and application tracking website for college students.

This should NOT just be a school demo where I upload a static JSON dataset of old jobs.

The main goal is for the website to actively maintain a database of real jobs that are currently open. When companies post new jobs, they should eventually appear on my site automatically. When a posting closes or disappears from the original company career site, my site should update it to closed instead of continuing to recommend it.

The website should help answer:

"What opportunities should I apply to right now, what opportunities should I prepare for, and what new opportunities have opened since I last checked?"

I want to use semantic/vector search as an important part of the project, but I want the overall website to feel like a useful real product rather than just a vector database demo.

TECH STACK

Please use a simple modern stack that is realistic for a college student to understand and maintain.

I am okay with something like:

Frontend:
- React / Next.js
- clean responsive UI

Backend:
- Python
- FastAPI

Database:
- a normal database for users, jobs, dates, eligibility requirements, application statuses, etc.
- ChromaDB for vector embeddings / semantic similarity

For the first version, SQLite is okay for structured data if that makes development easier, although structure the project so PostgreSQL could replace it later.

Use ChromaDB persistently for semantic job/resume matching.

Do not make the project unnecessarily complicated.

--------------------------------------------------
1. LIVE JOB COLLECTION
--------------------------------------------------

This is one of the most important parts of the website.

I want the backend to collect real job postings from company career systems.

Start with sources that are reasonably accessible, especially public job board/ATS systems such as:

- Greenhouse
- Lever
- Ashby

Do not start by trying to scrape the entire internet.

Create the system so I can maintain a list of companies/job boards that I want Opportunity Radar to monitor.

For example:

companies.json

Google
Duolingo
Ramp
Notion
Figma
Datadog
etc.

Obviously use only companies/sources where we can legally and technically obtain the postings.

Create separate job source/provider modules so the code is organized something like:

job_sources/
    greenhouse.py
    lever.py
    ashby.py

Each provider should convert jobs into one consistent internal format.

For example:

id
external_id
company
title
description
location
job_url
source
date_posted
first_seen
last_seen
deadline
employment_type
job_category
is_open

I want the program to be able to run a refresh process that checks these sources for current postings.

--------------------------------------------------
2. DETECT NEW AND CLOSED JOBS
--------------------------------------------------

Do not delete jobs just because they disappear.

I want Opportunity Radar to track the lifecycle of a posting.

For every refresh:

If a job appears for the first time:
mark it NEW.

If it already exists:
update last_seen and any changed information.

If a job previously existed but no longer appears on its source:
mark it CLOSED.

Store things like:

first_seen_at
last_seen_at
closed_at
status

Possible statuses:

NEW
OPEN
CLOSED

This is important because I want the website to show things like:

"32 new internships were posted today"

and:

"This job closed yesterday."

Do not keep recommending closed jobs.

--------------------------------------------------
3. AUTOMATIC REFRESHING
--------------------------------------------------

This should eventually run automatically without me manually clicking refresh.

Create the refresh code as its own background task/script.

For local development, I should be able to run something like:

python refresh_jobs.py

Later I want to deploy it so a scheduled job runs automatically, for example every few hours.

Structure it so it can work with something like:

- cron
- GitHub Actions
- a hosting provider's scheduled jobs
- another simple scheduler

Do not make the website request hundreds of company sites every time a user loads the page.

Refreshing jobs should happen separately in the background and the website should read from our own database.

--------------------------------------------------
4. CURRENT JOB FEED
--------------------------------------------------

The main website should have a live job feed.

Users should be able to see things like:

NEW TODAY

OPEN NOW

RECENTLY POSTED

BEST MATCHES

CLOSING SOON

SAVED

APPLIED

Only display jobs as "Open" when we have evidence that the posting is still active.

Show when Opportunity Radar first discovered the job.

For example:

Product Management Intern
Company X

Open
Found 6 hours ago

New

New York, NY

--------------------------------------------------
5. USER ACCOUNT / PROFILE
--------------------------------------------------

Users should be able to create a profile.

For the first version, basic authentication is enough.

User profile information can include:

name
school
major
graduation date/year
preferred roles
preferred locations
work authorization if they choose to provide it

Keep sensitive information minimal.

--------------------------------------------------
6. RESUME UPLOAD
--------------------------------------------------

Users should be able to upload a resume.

Start with PDF and/or plain text.

Extract the resume text.

Break the resume into useful sections/chunks such as:

education
experience
projects
skills

Do NOT invent anything that is not in the resume.

Store enough information so the resume can be compared semantically against job postings.

--------------------------------------------------
7. VECTOR DATABASE
--------------------------------------------------

This is an important class requirement.

Use ChromaDB as a persistent vector database.

Job descriptions should be embedded and stored in Chroma.

When a new job is discovered during a refresh:

1. save its structured information in the normal database
2. embed the useful job text
3. add it to Chroma

Do NOT re-embed every job every refresh.

Only create a new embedding when:

- the job is new
- important job text changed

The vector database should be used for fuzzy semantic questions.

The normal database should be used for exact information.

VECTOR DATABASE:

"What jobs are conceptually similar to this person's experience?"

STRUCTURED DATABASE:

"Is this job open?"
"When was it posted?"
"Where is it?"
"What company posted it?"
"Has this user applied?"
"What is the deadline?"

--------------------------------------------------
8. SEMANTIC RESUME MATCHING
--------------------------------------------------

Compare the user's resume against currently open jobs.

Do not just match keywords.

For example:

RESUME:

"Interviewed teachers and analyzed how they interacted with a mixed reality classroom system."

JOB:

"Work closely with customers to discover pain points and translate user needs into product improvements."

Those should potentially match even though they use different wording.

Return the most relevant currently open opportunities.

Closed jobs should not appear in normal recommendations.

--------------------------------------------------
9. DO NOT USE A FAKE "AI MATCH PERCENTAGE"
--------------------------------------------------

I do not want a random:

92% MATCH

that looks scientific but does not mean anything.

Instead use understandable categories like:

Excellent Match
Strong Match
Possible Match
Weak Match

If we use an internal numeric score for ranking, that is fine, but do not pretend it represents a probability of getting hired.

Explain why something matched.

--------------------------------------------------
10. WHY YOU MATCH
--------------------------------------------------

When someone opens a job, show something like:

WHY THIS MATCHES YOU

Job wants:
Experience identifying customer needs

Your experience:
Conducted user research with teachers using mixed-reality technology

Connection:
Your research experience involved understanding how real users interact with a technical product, which relates to the user discovery responsibilities described in this position.

Only make connections supported by the resume and job description.

Never invent experience.

--------------------------------------------------
11. ELIGIBILITY IS DIFFERENT FROM MATCH
--------------------------------------------------

This is a major feature.

Someone could be a great semantic match but not actually qualify.

Keep:

MATCH

and:

ELIGIBILITY

separate.

For example:

Experience Match:
STRONG

Eligibility:
LIKELY ELIGIBLE

or:

Eligibility:
NOT ELIGIBLE

Reason:
Position requires graduation between December 2027 and June 2028.

Use structured information for hard requirements when we can reliably extract them.

Examples:

graduation window
degree requirement
internship/full-time
location
years of experience
work authorization

If something is unknown, say:

UNKNOWN

Do NOT guess.

--------------------------------------------------
12. APPLY NOW / PREPARE / SAVE / SKIP
--------------------------------------------------

I want Opportunity Radar to actually help the user make decisions.

Every recommendation should have an action category.

APPLY NOW

Good match + eligible + currently open.

PREPARE

Very relevant opportunity that is known/expected to open later.

SAVE

Interesting but not urgent or not a strong enough match yet.

SKIP

Clearly ineligible or poor match.

--------------------------------------------------
13. JOBS OPENING SOON
--------------------------------------------------

Eventually I want this to be one of the main things that makes Opportunity Radar different.

Have a separate area:

OPENING SOON

There are two different types and they must NEVER be mixed up.

CONFIRMED OPENING

Example:

Applications open November 15.

This must come from an actual reliable source.

EXPECTED OPENING

Example:

Usually opens around early August.

This is a prediction based on historical information.

Clearly label predictions.

Never display:

"Opens November 15"

unless that date is actually known.

If we only predict it, say something like:

Expected around mid-November
Prediction — not confirmed

It is okay if the first version does not have sophisticated prediction yet.

Build the data model so we can add historical recruiting cycles later.

--------------------------------------------------
14. APPLICATION TRACKER
--------------------------------------------------

Users should be able to track applications inside the website.

Statuses:

Saved
Applied
Interview
Rejected
Offer
Withdrawn

Store:

job
company
date saved
date applied
current status
notes

Create a dashboard showing things like:

Saved: 12
Applied: 8
Interviews: 2
Offers: 1

--------------------------------------------------
15. EVENTUALLY EMAIL TRACKING
--------------------------------------------------

Do NOT make this required for the first version.

But structure the application tracker so we could eventually connect Gmail or another email provider.

The future feature would detect emails like:

"Thanks for applying"

and update a job to Applied.

Or:

"We would like to schedule an interview"

and suggest changing it to Interview.

This should be treated as a future feature, not something we need working immediately.

--------------------------------------------------
16. SEARCH
--------------------------------------------------

Users should also be able to search jobs using normal language.

Example:

"product internships where I can work with customers but still use my technical background"

This should use semantic search.

Filters should also exist for exact things like:

location
role type
company
internship/full-time
open/new
date posted

Semantic search + normal filters should work together.

--------------------------------------------------
17. DISCOVER CAREERS I DID NOT SEARCH FOR
--------------------------------------------------

This is another important part.

Do not only recommend jobs whose titles match what the user searched.

If someone's resume seems highly relevant to:

Product Management
Technical Program Management
Solutions Engineering
Product Operations

the website should be able to surface those related careers.

For example:

"You have mostly been searching Product Management, but your experience also matches several Solutions Engineering internships posted this week."

This is one reason I want vector search rather than only title filters.

--------------------------------------------------
18. USER DASHBOARD
--------------------------------------------------

I want the homepage/dashboard to feel useful immediately.

Something like:

------------------------------------------------

OPPORTUNITY RADAR

Good morning

17 new opportunities since your last visit

BEST NEW MATCHES

[Job card]
[Job card]
[Job card]

OPENING SOON

[Opportunity]
[Opportunity]

YOUR APPLICATIONS

Saved: 12
Applied: 8
Interview: 2
Offer: 0

------------------------------------------------

--------------------------------------------------
19. JOB CARD DESIGN
--------------------------------------------------

Each job card should show:

Company
Job title
Location

NEW if discovered recently

Open status

When we first discovered it

Match category

Eligibility

One-sentence reason it matches

Actions:

View
Save
Applied

Do not put huge amounts of text on every card.

The detailed explanation should be on the job page.

--------------------------------------------------
20. JOB DETAIL PAGE
--------------------------------------------------

When the user opens a job, show:

Job title
Company
Location
Posting URL
Status
When discovered
Posting date if known
Deadline if known

WHY YOU MATCH

RELATED RESUME EXPERIENCE

POSSIBLE GAPS

ELIGIBILITY

JOB DESCRIPTION

APPLY button linking to the ORIGINAL COMPANY APPLICATION PAGE.

Opportunity Radar should not pretend to be the employer.

--------------------------------------------------
21. SOURCE OF TRUTH
--------------------------------------------------

Always retain the original job URL and source.

Whenever possible, link users directly to the original company application page.

Do not silently invent missing job information.

If:

deadline = unknown

show:

Deadline not listed

rather than making one up.

--------------------------------------------------
22. FRESHNESS
--------------------------------------------------

Freshness is extremely important.

Store a last_verified time.

Example:

Verified open:
2 hours ago

If a source has not been checked recently, the website should be able to indicate that rather than guaranteeing that the job is still open.

--------------------------------------------------
23. DUPLICATE JOBS
--------------------------------------------------

The same position may appear more than once.

Create duplicate detection using things like:

external ID
company
title
location
URL

and potentially semantic similarity if necessary.

Do not show five copies of the same internship.

--------------------------------------------------
24. CLOSED JOBS
--------------------------------------------------

Do not completely erase closed jobs.

Keep them in the structured database because I eventually want to use historical information to understand:

- when companies recruit
- how long postings remain open
- when similar internships may open next year

But normal users should not see closed jobs in current recommendations unless they intentionally search historical data.

--------------------------------------------------
25. FUTURE OPENING PREDICTIONS
--------------------------------------------------

Eventually I want to use historical job data.

Example:

Google APM

2025 first seen:
September 20

2026 first seen:
September 22

Then in a future year Opportunity Radar might show:

Google APM
Expected opening: late September
Confidence: High
Not yet confirmed

DO NOT build a complicated machine learning model yet.

Just make sure our database keeps the historical information necessary to build this later.

--------------------------------------------------
26. PROJECT ARCHITECTURE
--------------------------------------------------

Please organize this into understandable sections.

Something roughly like:

opportunity-radar/

frontend/
    Next.js website

backend/
    main.py
    api/
    database/
    models/
    matching/
    eligibility/
    jobs/
        refresh.py
        providers/
            greenhouse.py
            lever.py
            ashby.py
    resume/
    tracker/

data/

chroma_store/

README.md

requirements.txt

.env.example

Change this structure if you have a simpler/better reason.

--------------------------------------------------
27. API ENDPOINTS
--------------------------------------------------

Create clean backend endpoints for things like:

GET /jobs

GET /jobs/new

GET /jobs/{id}

GET /recommendations

GET /opening-soon

POST /resume

POST /jobs/{id}/save

POST /jobs/{id}/status

GET /applications

Do not expose secret API keys to the frontend.

--------------------------------------------------
28. SCHEDULED JOB REFRESH
--------------------------------------------------

The scraping/import process should NOT happen inside normal website requests.

Build a separate worker/command.

Something like:

python -m jobs.refresh

It should:

1. query all configured job sources
2. normalize job data
3. detect new jobs
4. update existing jobs
5. mark disappeared jobs as closed
6. update Chroma embeddings for new/changed jobs
7. log what happened

Example output:

Checking 25 companies...

412 active postings found
21 new
7 changed
9 closed
375 unchanged

Vector database:
21 jobs embedded
7 jobs updated

--------------------------------------------------
29. LOGGING
--------------------------------------------------

Keep useful logs.

I want to know:

when a refresh ran
which providers worked
which failed
how many jobs were discovered
how many jobs closed
how many embeddings were added

One broken company's job board should not crash the entire refresh process.

--------------------------------------------------
30. DEVELOPMENT MODE
--------------------------------------------------

I need to be able to develop this without hitting hundreds of websites every minute.

Make it possible to:

run against a very small company list

and/or:

use saved fixture/test data.

For example:

python refresh_jobs.py --limit 3

--------------------------------------------------
31. DEPLOYMENT
--------------------------------------------------

Eventually I want this website hosted publicly.

Design it so the frontend and backend can be deployed.

Keep secrets in environment variables.

Include:

.env.example

Never commit real API keys.

Explain in the README what services would need to be deployed.

Do not force me to choose a paid provider yet.

--------------------------------------------------
32. IMPORTANT: DO NOT BUILD EVERYTHING AT ONCE
--------------------------------------------------

I want you to help me actually build this, not dump 5,000 lines of code that I cannot debug.

Build it in stages.

STAGE 1

Set up the frontend, backend, databases, and basic job model.

STAGE 2

Connect ONE real job source.

Retrieve real currently open jobs.

Store them locally.

Display them on the website.

STAGE 3

Create the refresh process.

Detect:

new
existing
closed

jobs.

STAGE 4

Add ChromaDB and semantic job searching.

STAGE 5

Add resume upload and resume/job matching.

STAGE 6

Add eligibility checking.

STAGE 7

Build the recommendation ranking:

APPLY NOW
PREPARE
SAVE
SKIP

STAGE 8

Add accounts and application tracking.

STAGE 9

Add additional job providers.

STAGE 10

Polish the dashboard and deploy it.

At the end of every stage:

- tell me what we built
- explain the important files
- give me exact commands to run it
- give me a small test to prove it works
- stop before moving to the next stage so I can verify it

--------------------------------------------------
33. MOST IMPORTANT PRODUCT RULE
--------------------------------------------------

Opportunity Radar should NOT just be:

"Here are jobs similar to your resume."

It should answer:

"What should I apply to today?"

"What new opportunities appeared?"

"What should I prepare for?"

"Am I actually eligible?"

"Why does this job fit me?"

"What am I missing?"

"What have I already applied to?"

And eventually:

"What internships are probably going to open soon?"

The website should become more useful every day because it is continuously maintaining job information rather than using one frozen dataset.

Start with STAGE 1 only.

Before writing a lot of code, briefly tell me the architecture you are choosing and why. Then create Stage 1.
```

```text
Start with STAGE 1 only.

Before writing a lot of code, briefly tell me the architecture you are choosing and why. Then create Stage 1.
```



```text
here are the requirements and also i want the design to be super close to the google careers website layout, and you dont need to do it in that many steps you can just make it all work like i explained in the first prompt and let me know what i need to do
```

```text
there are a bunch of bugs, like job types has intern and full time listed 2 times, i want the user to just be able to get on and see their saved stuff not have to connect to a backend, the settings bar has stuff for backend hitting the saved button gives no indication you actually hit it Your resume stays on the backend you connect. No external AI API is used. the user doesnt need to see this if ipening soon never has anything leave it off and just have a recently opened feature
```

```text
having jobs im not qualified for isnt helpful, the oly jobs i should be recommbeded for are ones that i should apply for because theyre a goof fit and in the for you i dont think it should be two seperate tabs i think in the jobs tab you can put your info in like any company and dont just give a list of 4 companies just do all or an open ended and then job type and take the students and early careers and then the jobs should appear most qualified to least and it should be only jobs taht match what you put and alos recenlty opened should just be a filter able to be seldcted, also in the info page make taht a tab where people are able to put the info already there and any skills or stuff like taht and theyre able to see the resume uploaded insted of making it look like it needs one uploaded
```

## Debugging Prompts

```text
when i try to login it says this This feature is temporarily unavailable. You can still view and update your saved roles. and thats an important part of my demo
```

```text
fix any bug you see and make the website fully functional and meeting all requirements
```

```text
For the public demo, upload a .txt resume. PDF extraction remains available in the local class version. it does this i hit save info and when i went to jobs it said add info even though i already did
```

```text
Eligibility: Unknown they all say this so just take it away and even after adding my graduation. date and years of experience im a junior getting matsers and phd recommendations
```

```text
Preferred roles
Preferred location (city, country, or remote)
 it doesnt make sense to have these since the main page asks and when i put in what i want to do in my own words it doesnt really change the results and just sticks to my skills and theses a where tab and also a location tab
```

```text
adding this `product management internship where I can do user research and work with customers` still changes nothing i get the same results
```

```text
Use my existing Render account
Yes, use Kadie's workspace
Keep the backend local for now
```
```text
there are a bunch of bugs, like job types has intern and full time listed 2 times, i want the user to just be able to get on and see their saved stuff not have to connect to a backend, the settings bar has stuff for backend hitting the saved button gives no indication you actually hit it Your resume stays on the backend you connect. No external AI API is used. the user doesnt need to see this if ipening soon never has anything leave it off and just have a recently opened feature
```

