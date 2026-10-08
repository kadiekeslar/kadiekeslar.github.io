# Scripture Graph

[Try the app](https://kadiekeslar.github.io/scripture-graph/) · [Backend code](https://github.com/kadiekeslar/scripture-graph-backend) · [Prompt log](prompt_log.md) · [Code guide](CODE_GUIDE.md)

For P2, I wanted to build off my HW4 Scripture Graph and make it more useful for actually studying. You can search for a Bible passage, person, topic, or question and compare it with another search. The app shows similarities and differences, and you can save what you find in notebook folders.

I wanted the connections to be easier to understand. Before, you could see that passages were connected, but you still had to read through them and figure out why. Now, clicking a yellow line gives you an explanation with the passages that support it.

## Using the app

1. Search for something like **Romans 8:28**, **Jesus**, or **fear**. Add a second search, such as **hope**, to compare them.
2. Click a passage to read it. Click a yellow connection to see the shared idea and what each passage adds.
3. Open the comparison findings to read similarities, differences, and study questions.
4. Choose **Review & save passage** or **Review & save study**. Check the contents and destination folder, then save.
5. Open **My notebook** to find your folders, write notes, and export a study. Notes save automatically. Deleted folders go to **Recently deleted**, where you can restore them.

## My favorite parts

The comparison is the part I care about most. I wanted it to show similarities and differences in what the passages are saying, even if they use different words or are not the exact same passage. You can click the yellow lines to understand the connection instead of just seeing two verses next to each other.

I also wanted the notebook to be easier to use. You can organize passages into folders, add notes, and come back to a study later. Before saving, you can see exactly what you are saving and which folder it will go into. If you delete a folder by accident, you can restore it.

Searches were another thing I wanted to improve. The graph can show up while the AI comparison is still loading, and repeated searches use saved results to avoid doing the same work again.

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

Add your OpenAI key as `OPENAI_API_KEY` in a `.env` file in the backend folder. You can also set `OPENAI_MODEL` if you want to choose the model. Then run:

```sh
python app.py
```

In another terminal, open the frontend repository and start a local web server:

```sh
cd kadiekeslar.github.io
python3 -m http.server 8000
```

Open `http://localhost:8000/scripture-graph/?api=http://127.0.0.1:5000` in your browser. This connects the page to the backend running on your computer. If you leave off the `api` setting, it uses the hosted backend instead.

## Secrets and saved notes

The OpenAI key is kept on the backend, not in the webpage code. Locally, it goes in `.env`, which is ignored by Git. For the hosted app, it goes in Render's environment settings.

The app may send your search and the passages it finds to OpenAI to get an explanation. Your notebook notes stay in your browser. They do not carry over to another device, so export your folder if you want a backup. Clearing your browser data also clears the notebook.

## Checks and limitations

Frontend checks: `node --test scripture-graph/tests/graph.test.cjs` from the frontend repository. Backend checks: `python -m unittest discover -s tests` from the backend repository after installing dependencies.

The app is meant for desktop use. The AI compares the passages the search finds, so it can miss context. Yellow connections show suggested shared ideas rather than published cross-references. A first search can still be slow if the hosted backend needs to wake up.

## AI-generated documentation and credits

I used OpenAI Codex with **GPT-6.1 Sol, medium reasoning** to help plan changes, write code, debug, and add comments. Codex wrote or changed much of the P2 code and drafted this README. I chose the features and gave feedback on things that were confusing or not working. The [prompt log](prompt_log.md) includes the prompts and fixes, including when a search for Jesus incorrectly returned Jesus called Justus.

The app uses the OpenAI API separately for search interpretation and comparisons. Its model is set through the backend's `OPENAI_MODEL` environment variable.

- [Free Use Bible API](https://bible.helloao.org/) provides Bible text, cross-references, and person metadata.
- [Cytoscape.js](https://js.cytoscape.org/) draws the interactive graph.
- [Flask](https://flask.palletsprojects.com/) runs the backend.
- [OpenAI](https://openai.com/) provides Codex and the API used for AI explanations.
