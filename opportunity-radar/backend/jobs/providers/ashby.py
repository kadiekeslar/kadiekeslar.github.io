from .common import normalize, plain, date


def fetch(client, board):
    response = client.get(f'https://api.ashbyhq.com/posting-api/job-board/{board["board"]}')
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload.get('jobs'), list):
        raise ValueError('Unexpected Ashby response')
    return [normalize(board, item['id'], item['title'], item.get('descriptionPlain') or plain(item.get('descriptionHtml')),
                      item.get('location'), item['jobUrl'], employment_type=item.get('employmentType'),
                      job_category=item.get('department'), date_posted=date(item.get('publishedAt')))
            for item in payload['jobs'] if item.get('isListed', True)]
