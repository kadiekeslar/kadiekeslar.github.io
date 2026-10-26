import html
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from backend.job_types import employment_type


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, data):
        self.parts.append(data)
    def handle_starttag(self, tag, attrs):
        if tag in ('p', 'li', 'br', 'h2', 'h3', 'div'):
            self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('p', 'li', 'h2', 'h3', 'div'):
            self.parts.append('\n')


def plain(value):
    parser = PlainText()
    parser.feed(html.unescape(value or ''))
    return re.sub(r'\n\s*\n+', '\n\n', ''.join(parser.parts)).strip()


def date(value):
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, timezone.utc)
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def canonical(url):
    parts = urlsplit(url)
    if parts.scheme not in ('https', 'http') or not parts.netloc:
        raise ValueError('Posting must have an original http(s) URL')
    # Keep job identifiers such as ?gh_jid=...; stripping all query parameters can
    # turn distinct application links into the same company careers homepage.
    query = urlencode([(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True)
                       if not key.lower().startswith('utm_') and key.lower() not in ('gh_src', 'lever-source')])
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip('/'), query, ''))


def normalize(board, external_id, title, description, location, url, **optional):
    if not external_id or not title or len(description.strip()) < 20:
        raise ValueError('Incomplete posting; refuse partial refresh')
    return dict(external_id=str(external_id), source=board['provider'], board_key=board['board'],
                company=board['company'], title=title.strip(), description=description,
                location=location or None, job_url=canonical(url),
                employment_type=employment_type(optional.get('employment_type'), title),
                job_category=optional.get('job_category'), date_posted=optional.get('date_posted'))
