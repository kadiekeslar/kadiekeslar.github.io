from .common import normalize, plain


def fetch(client, board):
    response = client.get(f'https://boards-api.greenhouse.io/v1/boards/{board["board"]}/jobs', params={'content': 'true'})
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload.get('jobs'), list) or payload.get('meta', {}).get('total', len(payload['jobs'])) != len(payload['jobs']):
        raise ValueError('Unexpected or incomplete Greenhouse response')
    return [normalize(board, item['id'], item['title'], plain(item['content']),
                      item.get('location', {}).get('name'), item['absolute_url'],
                      job_category=', '.join(d['name'] for d in item.get('departments', [])) or None)
            for item in payload['jobs']]
