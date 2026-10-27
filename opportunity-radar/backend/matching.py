"""Conservative, evidence-based requirements, independent of vector similarity."""
import calendar
import re
from datetime import date

from dateutil.parser import parse

MONTH = r'(?:January|February|March|April|May|June|July|August|September|October|November|December)'


def eligibility(job, profile):
    text = job.description
    checks = []
    years = re.search(r'(\d+)(?:\s*[-–]\s*\d+)?\+?\s+years?(?:\s+of)?\s+(?:(?:relevant|professional|industry|related|work)\s+)*experience', text, re.I)
    if years:
        required = int(years[1])
        actual = profile.get('years_experience')
        checks.append({'requirement': years[0], 'result': 'Unknown' if actual is None else 'Pass' if actual >= required else 'Fail'})
    senior = re.search(r'\b(senior|staff|principal|director|head of|vice president)\b', job.title, re.I)
    if senior:
        actual = profile.get('years_experience')
        minimum = 8 if senior[1].lower() in ('principal', 'director', 'head of', 'vice president') else 5
        checks.append({'requirement': f'{senior[1]} role: conservative {minimum}+ years experience screen',
                       'result': 'Unknown' if actual is None else 'Pass' if actual >= minimum else 'Fail'})
    for sentence in re.split(r'[\n.!?]', text):
        if re.search(r'graduat|graduating', sentence, re.I):
            window = re.search(fr'between\s+({MONTH})\s+(20\d\d)\s+and\s+({MONTH})\s+(20\d\d)', sentence, re.I)
            if window:
                start = parse(f'{window[1]} 1 {window[2]}').date()
                end_month = parse(f'{window[3]} 1 {window[4]}').date()
                end = end_month.replace(day=calendar.monthrange(end_month.year, end_month.month)[1])
                graduation = profile.get('graduation_date')
                checks.append({'requirement': sentence.strip(), 'result': 'Unknown' if not graduation else 'Pass' if start <= date.fromisoformat(graduation) <= end else 'Fail'})
    if re.search(r'(?:unable to|cannot|do not|does not|will not)\s+(?:provide\s+|offer\s+)?(?:visa\s+)?sponsor', text, re.I):
        sponsorship = profile.get('needs_sponsorship')
        checks.append({'requirement': 'Posting states sponsorship is not offered', 'result': 'Unknown' if sponsorship is None else 'Fail' if sponsorship else 'Pass'})
    if any(check['result'] == 'Fail' for check in checks):
        label = 'Not eligible'
    elif checks and all(check['result'] == 'Pass' for check in checks):
        label = 'Likely eligible'
    else:
        label = 'Unknown'
    return {'label': label, 'checks': checks,
            'note': 'Checks cover recognized experience, graduation windows, and sponsorship statements. Senior titles also use a conservative experience screen (5 years; principal/director and above: 8). These screens are not employer-stated requirements. Degree and other requirements still need review.'}


def decision(match, eligible, verified):
    if eligible == 'Not eligible' or match == 'Weak Match':
        return 'SKIP'
    if verified and eligible == 'Likely eligible' and match in ('Excellent Match', 'Strong Match'):
        return 'APPLY NOW'
    return 'SAVE'


def resume_sections(text):
    sections, name, lines = [], 'Overview', []
    for line in text.splitlines():
        if re.fullmatch(r'\s*(education|experience|work experience|projects|skills|technical skills|research|leadership)\s*:?[\s]*', line, re.I):
            if lines:
                sections.append({'section': name, 'text': '\n'.join(lines).strip()})
            name, lines = line.strip().rstrip(':'), []
        elif line.strip():
            lines.append(line)
    if lines:
        sections.append({'section': name, 'text': '\n'.join(lines).strip()})
    return sections
