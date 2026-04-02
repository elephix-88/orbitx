from pydantic import BaseModel


class ErrorPayload(BaseModel):
    """Payload describing a workflow execution failure.

    Passed from the Prefect failure hook to the error trigger workflow.
    """

    workflow_id: str
    workflow_name: str
    execution_id: str
    failed_node: str | None = None
    error_message: str
    timestamp: float


class ErrorTriggerConfig(BaseModel):
    """Config for the ErrorTrigger source node.

    No user-configurable fields at design time. The error_payload is injected
    at runtime by the trigger-error endpoint before submitting the workflow
    to Prefect for execution.
    """

    error_payload: ErrorPayload | None = None
