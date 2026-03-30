from enum import StrEnum

from pydantic import BaseModel


class ExecutionMode(StrEnum):
    ASYNC = "insights_async"
    SYNC = "sync"
    ERROR = "error"


class Group(StrEnum):
    INSIGHTS = "insights"
    ACTIONS = "actions"
    ACTION_VALUES = "action_values"
    CONVERSIONS = "conversions"
    BREAKDOWNS = "breakdowns"
    CAMPAIGNS = "campaigns"
    ADS = "ads"


class TimeRange(BaseModel):
    since: str
    until: str
