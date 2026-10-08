# Scripture Graph

[Try the app](https://kadiekeslar.github.io/scripture-graph/) · [Backend code](https://github.com/kadiekeslar/scripture-graph-backend) · [Prompt log](prompt_log.md) · [Code guide](CODE_GUIDE.md)

Scripture Graph helps you explore Bible passages and compare ideas without opening every verse one at a time. Search for a reference, person, topic, or question, then add a second search to see how the two selections relate. You can save passages and comparisons in notebook folders and add your own notes.

This project builds on the Scripture Graph from HW4. P2 adds comparisons of meaning, explanations for connections, faster searches, and a notebook for keeping a study together.

## Using the app

1. Search for something like **Romans 8:28**, **Jesus**, or **fear**. Add a second search, such as **hope**, to compare them.
2. Click a passage to read it. Click a yellow connection to see the shared idea and what each passage adds.
3. Open the comparison findings to read similarities, differences, and study questions.
4. Choose **Review & save passage** or **Review & save study**. Check the contents and destination folder, then save.
5. Open **My notebook** to find your folders, write notes, and export a study. Notes save automatically. Deleted folders go to **Recently deleted**, where you can restore them.

## Features that stand out

The yellow connections are useful because they explain why different passages relate, even when they do not share the same reference. Each explanation points back to supporting passages so you can check it yourself.

The notebook turns a search into something you can return to. Folders keep passages and notes together, and the save review makes it clear what is being saved and where it will go.

The graph loads before the optional AI explanation finishes. Repeated searches use cached results, and loading messages show when a comparison is still being prepared.

## Run it locally

Clone both repositories:

```sh
git clone https://github.com/kadiekeslar/kadiekeslar.github.io.git
git clone https://github.com/kadiekeslar/scripture-graph-backend.git
```

Start the backend:

```sh
cd scripture-graph-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the backend folder with `OPENAI_API_KEY`. You can also set `OPENAI_MODEL` to a model available to your account. Then run:

```sh
python app.py
```

In another terminal, open the frontend repository and start a local web server:

```sh
cd kadiekeslar.github.io
python3 -m http.server 8000
```

Visit `http://localhost:8000/scripture-graph/?api=http://127.0.0.1:5000`. The `api` setting connects the page to your local backend. Without it, the page uses the deployed backend.

## Secrets and saved notes

The OpenAI key stays on the backend in environment variables or the ignored `.env` file. It is never placed in the frontend code. On Render, it is stored in the service's environment settings.

Searches and retrieved passages may be sent to OpenAI for explanations. Personal notebook notes stay in your browser's local storage. They do not sync between devices, and clearing browser data removes them, so use **Export folder** to keep a backup.

## Checks and limitations

Frontend checks: `node --test scripture-graph/tests/graph.test.cjs` from the frontend repository. Backend checks: `python -m unittest discover -s tests` from the backend repository after installing dependencies.

The app is designed for desktop use. AI explanations cover the passages retrieved for a search and can miss context. Yellow thematic connections are interpretations, not published cross-references. The first search can also take longer if the hosted backend needs to wake up.

## AI-generated documentation and credits

This README was drafted by OpenAI Codex using **GPT-6.1 Sol with medium reasoning**. Codex also wrote or substantially modified much of the P2 code, tests, and explanatory comments. The project direction and interface revisions came from the student's requests and feedback. The [prompt log](prompt_log.md) records the development process, including the incorrect Jesus/Justus result and its fix.

The app uses the OpenAI API separately for search interpretation and comparisons. Its model is set through the backend's `OPENAI_MODEL` environment variable.

- [Free Use Bible API](https://bible.helloao.org/) provides Bible text, cross-references, and person metadata.
- [Cytoscape.js](https://js.cytoscape.org/) draws the interactive graph.
- [Flask](https://flask.palletsprojects.com/) runs the backend.
- [OpenAI](https://openai.com/) provides Codex and the API used for AI explanations.
