"""S3 source configuration schema."""
from pydantic import BaseModel


class S3SourceConfig(BaseModel):
    """Configuration for S3 data source."""
    file_path: str
    file_format: str
