from enum import Enum

from pydantic import BaseModel


class ExecutionMode(str, Enum):
    ASYNC = "insights_async"
    SYNC = "sync"
    ERROR = "error"


class Group(str, Enum):
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
