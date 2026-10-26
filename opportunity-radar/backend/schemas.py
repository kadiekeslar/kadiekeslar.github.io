from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, HttpUrl, computed_field, field_serializer


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    external_id: str
    source: str
    company: str
    title: str
    description: str
    location: str | None
    job_url: HttpUrl
    employment_type: str | None
    job_category: str | None
    status: Literal['NEW', 'OPEN', 'CLOSED']
    date_posted: datetime | None
    deadline: datetime | None
    first_seen_at: datetime
    last_seen_at: datetime
    last_verified_at: datetime | None
    closed_at: datetime | None

    @field_serializer('date_posted', 'deadline', 'first_seen_at', 'last_seen_at', 'last_verified_at', 'closed_at')
    def utc_date(self, value):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc).isoformat() if value.tzinfo is None else value.isoformat()

    @computed_field
    @property
    def verified_open(self) -> bool:
        if self.status == 'CLOSED' or not self.last_verified_at:
            return False
        verified = self.last_verified_at.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - verified).total_seconds()
        return 0 <= age <= 86400
