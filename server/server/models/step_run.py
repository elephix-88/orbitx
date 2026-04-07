from pydantic import BaseModel


class StepRunRequest(BaseModel):
    auto_pin: bool = False
