import pandas as pd
from pydantic import BaseModel

from common.model.common import BaseFieldSchema


class ExtractorResult(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    data: pd.DataFrame
    primary_keys: list[str]
    report_level: str
    field_schemas: list[BaseFieldSchema] | None = None
