from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel


class ConditionOperator(StrEnum):
    equals = "equals"
    not_equals = "not_equals"
    greater_than = "greater_than"
    less_than = "less_than"
    contains = "contains"
    is_empty = "is_empty"
    is_not_empty = "is_not_empty"


class Condition(BaseModel):
    field: str
    operator: ConditionOperator
    value: Any | None = None
    # value is None for is_empty / is_not_empty operators.


class IfNodeConfig(BaseModel):
    conditions: list[Condition]
    logic: Literal["AND", "OR"] = "AND"


class SwitchCase(BaseModel):
    case_id: str
    # Stable identifier for this case, used as from_port in Connection.
    # e.g., "case_0", "case_1"
    value: str
    # The field value that routes to this case.


class SwitchNodeConfig(BaseModel):
    field: str
    cases: list[SwitchCase]
    default_case_id: str = "default"
    # case_id used when no case matches; corresponds to from_port "default".
