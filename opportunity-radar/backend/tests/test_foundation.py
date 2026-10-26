from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
import pytest

from backend.database import Job, utcnow
from backend.main import create_app


@pytest.fixture
def app(tmp_path):
    return create_app(f'sqlite:///{tmp_path / "jobs.sqlite3"}', tmp_path / 'chroma')


def record(external_id, **changes):
    fields = dict(external_id=external_id, company='Test company', title='Test-only internship',
                  description='Fixture data, never imported into the real database.',
                  source='test', board_key='test-company', job_url=f'https://example.com/jobs/{external_id}',
                  status='NEW', last_verified_at=utcnow())
    return Job(**(fields | changes))


def test_empty_start_and_health(app):
    with TestClient(app) as client:
        health = client.get('/health').json()
        assert health['database'] == health['vectors'] == 'connected'
        assert health['embedded_jobs'] == health['sources_connected'] == 0
        assert client.get('/jobs').json() == {'items': [], 'total': 0}
        assert client.get('/stats').json()['verified_open'] == 0
        assert client.get('/jobs/missing').status_code == 404


def test_closed_history_and_freshness_are_separate(app):
    with TestClient(app) as client:
        with app.state.sessions() as session:
            session.add_all([record('fresh'), record('stale', status='OPEN', last_verified_at=utcnow()-timedelta(days=3)),
                             record('closed', status='CLOSED', closed_at=utcnow()),
                             record('unknown', last_verified_at=None)])
            session.commit()
        current = client.get('/jobs').json()
        assert current['total'] == 3
        by_id = {job['external_id']: job for job in current['items']}
        assert by_id['fresh']['verified_open'] is True
        assert by_id['stale']['verified_open'] is False
        assert by_id['unknown']['verified_open'] is False
        assert by_id['fresh']['last_verified_at'].endswith('+00:00')
        history = client.get('/jobs?status=CLOSED').json()
        assert history['total'] == 1
        assert history['items'][0]['verified_open'] is False
        assert client.get('/stats').json()['verified_open'] == 1
        assert client.get('/jobs/new').json()['total'] == 2
        assert client.get('/jobs/' + by_id['fresh']['id']).json()['company'] == 'Test company'


def test_exact_filters_and_pagination(app):
    with TestClient(app) as client:
        with app.state.sessions() as session:
            session.add_all([record('one', location='Pittsburgh', employment_type='Internship'),
                             record('two', location='New York', company='Different company')])
            session.commit()
        result = client.get('/jobs', params={'location': 'Pittsburgh', 'employment_type': 'Internship'}).json()
        assert result['total'] == 1
        assert result['items'][0]['external_id'] == 'one'
        assert client.get('/jobs?company=Nope').json()['total'] == 0
        result = client.get('/jobs?limit=1&offset=1').json()
        assert result['total'] == 2 and len(result['items']) == 1
        assert client.get('/jobs?limit=1000').status_code == 422
        assert client.get('/jobs?status=INVALID').status_code == 422
        assert client.get('/jobs?offset=-1').status_code == 422


def test_source_identity_uniqueness(app):
    with TestClient(app):
        with app.state.sessions() as session:
            session.add_all([record('same'), record('same')])
            with pytest.raises(IntegrityError):
                session.commit()


def test_structured_and_vector_data_survive_app_restart(tmp_path):
    url, path = f'sqlite:///{tmp_path / "persistent.sqlite3"}', tmp_path / 'vectors'
    first = create_app(url, path)
    with TestClient(first):
        with first.state.sessions() as session:
            session.add(record('persistent'))
            session.commit()
        # Explicit test vector; no model downloads or semantic search in Stage 1.
        first.state.jobs_collection.upsert(ids=['test-vector'], embeddings=[[0.1, 0.2, 0.3]])
    second = create_app(url, path)
    with TestClient(second) as client:
        assert client.get('/jobs').json()['total'] == 1
        assert client.get('/health').json()['embedded_jobs'] == 1
