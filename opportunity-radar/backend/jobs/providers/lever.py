from .common import normalize, plain, date


def fetch(client, board):
    records, offset = [], 0
    while True:
        response = client.get(f'https://api.lever.co/v0/postings/{board["board"]}', params={'mode': 'json', 'skip': offset, 'limit': 100})
        response.raise_for_status()
        page = response.json()
        if not isinstance(page, list):
            raise ValueError('Unexpected Lever response')
        records.extend(page)
        if len(page) < 100:
            break
        offset += 100
        if offset > 10000:
            raise ValueError('Lever pagination exceeded safety bound')
    return [normalize(board, item['id'], item['text'], plain('\n'.join([
        item.get('description', ''), *[x.get('text', '') + '\n' + x.get('content', '') for x in item.get('lists', [])],
        item.get('additional', '')])), item.get('categories', {}).get('location'), item['hostedUrl'],
        employment_type=item.get('categories', {}).get('commitment'), job_category=item.get('categories', {}).get('team'),
        date_posted=date(item.get('createdAt'))) for item in records]
