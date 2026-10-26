import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')


def database_url():
    url = os.getenv('DATABASE_URL', 'sqlite:///data/opportunities.sqlite3')
    if url.startswith('sqlite:///') and url != 'sqlite:///:memory:':
        path = Path(url.removeprefix('sqlite:///'))
        if not path.is_absolute():
            path = ROOT / path
        path.parent.mkdir(parents=True, exist_ok=True)
        return f'sqlite:///{path}'
    return url


def chroma_path():
    path = Path(os.getenv('CHROMA_PATH', 'chroma_store'))
    return path if path.is_absolute() else ROOT / path
