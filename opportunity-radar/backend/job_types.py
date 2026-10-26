"""Stable labels across ATS providers, including existing imported records."""
import re


def employment_type(value, title=''):
    key = re.sub(r'[\s_-]', '', value or '').lower()
    aliases = {'intern': 'Internship', 'internship': 'Internship', 'fulltime': 'Full-time',
               'parttime': 'Part-time', 'contract': 'Contract', 'contractor': 'Contract',
               'temporary': 'Temporary'}
    if key in aliases:
        return aliases[key]
    if not value and re.search(r'\bintern(ship)?\b', title, re.I):
        return 'Internship'
    return value or None
