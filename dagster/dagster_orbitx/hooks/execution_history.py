from dagster import HookContext, failure_hook, success_hook
from loguru import logger


@success_hook
def on_workflow_success(context: HookContext) -> None:
    workflow_id = context.run_tags.get("workflow_id", "unknown")
    user_id = context.run_tags.get("user_id", "unknown")
    logger.success(f"Run completed — workflow={workflow_id} user={user_id}")


@failure_hook
def on_workflow_failure(context: HookContext) -> None:
    workflow_id = context.run_tags.get("workflow_id", "unknown")
    user_id = context.run_tags.get("user_id", "unknown")
    logger.error(f"Run failed — workflow={workflow_id} user={user_id}")
