from datetime import timedelta
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.database import Job, JobEvent, VectorState, utcnow
from backend.main import create_app
from backend.jobs.refresh import reconcile
from backend.matching import eligibility


@pytest.fixture
def app(tmp_path):
    return create_app(f'sqlite:///{tmp_path / "jobs.sqlite3"}', tmp_path / 'chroma')


def record(external_id, **changes):
    fields = dict(external_id=external_id, company='Test company', title='Test internship', description='Qualitative interviews and usability studies inform product decisions.',
                  source='test', board_key='test-company', job_url=f'https://example.com/jobs/{external_id}', status='NEW', last_verified_at=utcnow())
    return Job(**(fields | changes))


def account(client, email='test@example.com'):
    response = client.post('/auth/register', json={'email':email, 'password':'test-password-123'})
    assert response.status_code == 200, response.text
    return {'Authorization': 'Bearer ' + response.json()['token']}


def test_empty_start_and_validation(app):
    with TestClient(app) as client:
        health = client.get('/health').json()
        assert health['database'] == health['vectors'] == 'connected'
        assert health['embedded_chunks'] == health['sources_connected'] == 0
        assert client.get('/jobs').json()['total'] == 0
        assert client.get('/jobs/missing').status_code == 404
        assert client.get('/jobs?limit=1000').status_code == 422
        assert client.get('/jobs?status=BAD').status_code == 422
        assert client.get('/applications').status_code == 401


def test_closed_and_stale_records_are_not_verified(app):
    with TestClient(app) as client:
        with app.state.sessions() as session:
            session.add_all([record('fresh'),record('stale',status='OPEN',last_verified_at=utcnow()-timedelta(days=3)),record('closed',status='CLOSED'),record('unknown',last_verified_at=None)])
            session.commit()
        items=client.get('/jobs').json()['items']
        assert len(items)==3
        by_id={x['external_id']:x for x in items}
        assert by_id['fresh']['verified_open'] is True
        assert by_id['stale']['verified_open'] is False
        assert by_id['unknown']['verified_open'] is False
        assert client.get('/jobs?status=CLOSED').json()['total']==1
        assert client.get('/stats').json()['verified_open']==1


def test_refresh_new_changed_closed_reopened_and_guard(app):
    board={'provider':'test','board':'test-company','company':'Test company'}
    def fields(i,description='A real complete description for testing job refresh.'):
        return dict(external_id=i,source='test',board_key='test-company',company='Test company',title='Engineer',description=description,location='NY',job_url=f'https://example.com/{i}')
    with TestClient(app):
        first=reconcile(app.state.sessions,board,[fields('a'),fields('b'),fields('c')])
        assert first['new']==3
        with pytest.raises(ValueError):
            reconcile(app.state.sessions,board,[])
        second=reconcile(app.state.sessions,board,[fields('a','Changed description with new responsibilities.'),fields('b')])
        assert second['closed']==second['changed']==1
        third=reconcile(app.state.sessions,board,[fields('a'),fields('b'),fields('c')])
        assert third['reopened']==1
        with app.state.sessions() as s:
            assert len(s.scalars(select(Job)).all())==3
            assert len(s.scalars(select(JobEvent).where(JobEvent.event=='CLOSED')).all())==1


def test_profile_tracker_and_private_data_isolation(app):
    with TestClient(app) as client:
        one=account(client)
        two=account(client,'other@example.com')
        assert client.put('/me',headers=one,json={'name':'Fixture student','years_experience':1}).status_code==200
        assert client.get('/me',headers=two).json()['profile']=={}
        with app.state.sessions() as s:
            job=record('track');s.add(job);s.commit();job_id=job.id
        assert client.post(f'/jobs/{job_id}/status',headers=one,json={'status':'Applied','notes':'Test note'}).status_code==200
        assert client.get('/applications',headers=one).json()['items'][0]['notes']=='Test note'
        assert client.get('/applications',headers=two).json()['items']==[]
        # Saving an already-applied job must not regress its application status or erase notes.
        client.post(f'/jobs/{job_id}/save',headers=one)
        assert client.get('/applications',headers=one).json()['items'][0]['status']=='Applied'
        assert client.post('/auth/login',json={'email':'test@example.com','password':'wrong-password'}).status_code==401
        assert client.post('/auth/logout',headers=one).status_code==200
        assert client.get('/me',headers=one).status_code==401


def test_explicit_eligibility_unknown_and_failures():
    job=record('elig',description='Graduation between December 2027 and June 2028. Requires 3 years of experience. We cannot provide visa sponsorship.')
    assert eligibility(job,{})['label']=='Unknown'
    assert eligibility(job,{'years_experience':1})['label']=='Not eligible'
    profile={'years_experience':3,'graduation_date':'2028-06-30','needs_sponsorship':False}
    assert eligibility(job,profile)['label']=='Likely eligible'
    assert eligibility(job,profile|{'graduation_date':'2028-07-01'})['label']=='Not eligible'
    assert eligibility(job,profile|{'needs_sponsorship':True})['label']=='Not eligible'


def test_runtime_addition_semantic_retrieval_resume_and_index_retry(app):
    with TestClient(app) as client:
        auth=account(client)
        body={'company':'Test-only public posting','title':'Security specialist','description':'Build platforms and tooling to detect and respond to infrastructure and corporate security threats. Perform code audits and technical assessments.','job_url':'https://example.com/security','location':'Remote'}
        response=client.post('/jobs/import',headers=auth,json=body)
        assert response.status_code==200,response.text
        assert response.json()['job']['verified_open'] is False
        assert client.post('/jobs/import',headers=auth,json=body).json()['duplicate'] is True
        results=client.get('/jobs',params={'q':'defend against hackers trying to break in'}).json()
        assert any(x['title']=='Security specialist' for x in results['items'])
        # Unverified manual submissions do not enter normal resume recommendations.
        text=b'SKILLS\nNetwork security and infrastructure threat detection.\nEXPERIENCE\nPerformed code audits and investigated suspicious activity.'
        upload=client.post('/resume',headers=auth,files={'file':('resume.txt',text,'text/plain')})
        assert upload.status_code==200,upload.text
        assert upload.json()['chunks']>0
        assert client.get('/recommendations',headers=auth).json()['items']==[]
        assert client.delete('/resume',headers=auth).status_code==200
        assert not client.get('/me',headers=auth).json()['has_resume']
        before=app.state.vectors.jobs.count()
        assert app.state.vectors.index_pending(app.state.sessions)==0
        assert app.state.vectors.jobs.count()==before


def test_persistence_and_chunk_bounds(tmp_path):
    url,path=f'sqlite:///{tmp_path / "persist.sqlite3"}',tmp_path/'vectors'
    first=create_app(url,path)
    with TestClient(first):
        with first.state.sessions() as s:
            s.add(record('persist'));s.commit()
        assert first.state.vectors.index_pending(first.state.sessions)==1
        for chunk in first.state.vectors.chunks('semantic persistence verification '*1000):
            assert len(first.state.vectors._tokenizer.encode(chunk,add_special_tokens=False).ids)<=220
        count=first.state.vectors.jobs.count()
    second=create_app(url,path)
    with TestClient(second) as client:
        assert client.get('/jobs').json()['total']==1
        assert client.get('/health').json()['embedded_chunks']==count
        assert second.state.vectors.search('usability research',limit=1)


def test_resume_evidence_and_ineligibility_remain_separate(app):
    with TestClient(app) as client:
        auth=account(client)
        with app.state.sessions() as s:
            job=record('match',title='Security specialist',description='Requires 3 years of experience. Build platforms and tooling to detect and respond to corporate security threats. Perform code audits and technical assessments.')
            closed=record('closed-match',title='Closed security specialist',description=job.description,status='CLOSED')
            s.add_all([job,closed]);s.commit();job_id=job.id
        app.state.vectors.index_pending(app.state.sessions)
        client.put('/me',headers=auth,json={'years_experience':0})
        resume=b'EXPERIENCE\nBuild platforms and tooling to detect and respond to corporate security threats. Perform code audits and technical assessments.'
        assert client.post('/resume',headers=auth,files={'file':('resume.txt',resume,'text/plain')}).status_code==200
        result=client.get('/recommendations',headers=auth).json()
        assert len(result['items'])==1
        hit=result['items'][0]
        assert hit['id']==job_id and hit['action']=='SKIP'
        assert hit['eligibility']['label']=='Not eligible'
        assert hit['resume_evidence'] in resume.decode()
        assert 'security threats' in hit['evidence']
        assert client.get('/jobs/'+job_id,headers=auth).json()['connections']


def test_original_application_identifiers_survive_normalization():
    from backend.jobs.providers.common import canonical
    assert canonical('https://example.com/careers?gh_jid=123&utm_source=test')=='https://example.com/careers?gh_jid=123'
    assert canonical('https://example.com/careers?gh_jid=456')!='https://example.com/careers?gh_jid=123'
