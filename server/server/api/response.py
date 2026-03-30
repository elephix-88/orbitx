from typing import Any, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse[T](BaseModel):
    data: T
    success: bool = True
    error: str | None = None
    total: int | None = None
    page: int | None = None
    limit: int | None = None


def success_response(data: Any, **kwargs) -> dict:
    return ApiResponse(data=data, **kwargs).model_dump()
