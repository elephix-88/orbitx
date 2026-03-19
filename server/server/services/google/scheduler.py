import json

from google.api_core import exceptions
from google.cloud import scheduler_v1
from loguru import logger

from server.configs.config import settings


class SchedulerService:
    def __init__(self):
        """Initialize the scheduler service."""
        self.enabled = settings.google_cloud_scheduler_enabled
        self.project_id = settings.google_cloud_project_id
        self.location = settings.google_cloud_location
        self.cloud_run_job_name = settings.google_cloud_job_name
        self.timezone = settings.google_cloud_scheduler_timezone

        if self.enabled:
            try:
                self.client = scheduler_v1.CloudSchedulerClient()
                self.parent = f"projects/{self.project_id}/locations/{self.location}"
                logger.info(
                    f"Scheduler service initialized for project: {self.project_id}, timezone: {self.timezone}"
                )
            except Exception as e:
                logger.error(f"Failed to initialize Cloud Scheduler client: {e}")
                self.enabled = False
        else:
            logger.warning("Cloud Scheduler is disabled in settings")

    def _get_job_path(self, job_id: str) -> str:
        """Generate the full path for a scheduler job.

        Args:
            job_id: The workflow job ID

        Returns:
            Full path to the scheduler job
        """
        sanitized_id = job_id.replace("_", "-").replace(" ", "-").lower()
        job_name = f"workflow-{sanitized_id}"
        return f"{self.parent}/jobs/{job_name}"

    def _build_http_target(self, job_id: str) -> scheduler_v1.HttpTarget:
        """Build HTTP target for scheduler job to trigger Cloud Run Job.

        Args:
            job_id: The workflow job ID

        Returns:
            Configured HttpTarget for Cloud Scheduler
        """
        uri = f"https://{self.location}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/{settings.google_cloud_project_number}/jobs/{self.cloud_run_job_name}:run"  # noqa
        body_data = {
            "overrides": {
                "containerOverrides": [
                    {
                        "args": [
                            "uv",
                            "run",
                            "apps/workflow.py",
                            "--job_id",
                            job_id,
                            "--run",
                            "all",
                        ]
                    }
                ]
            }
        }

        return scheduler_v1.HttpTarget(
            uri=uri,
            http_method=scheduler_v1.HttpMethod.POST,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Google-Cloud-Scheduler",
            },
            body=json.dumps(body_data).encode(),
            oauth_token=scheduler_v1.OAuthToken(
                service_account_email=settings.google_cloud_service_account_email,
                scope="https://www.googleapis.com/auth/cloud-platform",
            ),
        )

    def create_workflow_schedule(
        self,
        job_id: str,
        job_name: str,
        schedule_expression: str,
    ) -> bool:
        """Create a Cloud Scheduler job for a workflow.

        Args:
            job_id: Unique identifier for the workflow
            job_name: Human-readable name for the workflow
            schedule_expression: Cron expression for the schedule (5 fields)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Scheduler is disabled, skipping job creation")
            return False

        if not schedule_expression or schedule_expression.strip() == "":
            logger.warning(f"No schedule expression provided for workflow {job_id}")
            return False

        try:
            job_path = self._get_job_path(job_id)
            http_target = self._build_http_target(job_id)

            job = scheduler_v1.Job(
                name=job_path,
                description=f"Scheduled execution for workflow: {job_name}",
                schedule=schedule_expression,
                time_zone=self.timezone,
                http_target=http_target,
            )

            request = scheduler_v1.CreateJobRequest(
                parent=self.parent,
                job=job,
            )

            response = self.client.create_job(request=request)
            logger.success(f"Created scheduler job: {response.name}")
            return True

        except Exception as ex:
            logger.error(f"Failed to create scheduler job: {ex}")
            raise

    def update_workflow_schedule(
        self,
        job_id: str,
        job_name: str,
        schedule_expression: str,
    ) -> bool:
        """Update an existing Cloud Scheduler job.

        Args:
            job_id: Unique identifier for the workflow
            job_name: Human-readable name for the workflow
            schedule_expression: Cron expression for the schedule (5 fields)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Scheduler is disabled, skipping job update")
            return False

        if not schedule_expression or schedule_expression.strip() == "":
            logger.info(
                f"Empty schedule expression for workflow {job_id}, deleting scheduler job"
            )
            return self.delete_workflow_schedule(job_id)

        try:
            job_path = self._get_job_path(job_id)

            try:
                self.client.get_job(name=job_path)
            except exceptions.NotFound:
                logger.warning(
                    f"Scheduler job not found for workflow {job_id}, creating new one"
                )
                return self.create_workflow_schedule(
                    job_id, job_name, schedule_expression
                )

            http_target = self._build_http_target(job_id)

            updated_job = scheduler_v1.Job(
                name=job_path,
                description=f"Scheduled execution for workflow: {job_name}",
                schedule=schedule_expression,
                time_zone=self.timezone,
                http_target=http_target,
            )

            request = scheduler_v1.UpdateJobRequest(job=updated_job)
            response = self.client.update_job(request=request)
            logger.success(f"Updated scheduler job: {response.name}")
            return True

        except Exception as e:
            logger.error(f"Failed to update scheduler job for workflow {job_id}: {e}")
            raise

    def delete_workflow_schedule(self, job_id: str) -> bool:
        """Delete a Cloud Scheduler job.

        Args:
            job_id: Unique identifier for the workflow

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Scheduler is disabled, skipping job deletion")
            return False

        try:
            job_path = self._get_job_path(job_id)

            request = scheduler_v1.DeleteJobRequest(name=job_path)
            self.client.delete_job(request=request)
            logger.success(f"Deleted scheduler job for workflow: {job_id}")
            return True

        except exceptions.NotFound:
            logger.warning(
                f"Scheduler job not found for workflow {job_id}, already deleted"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete scheduler job for workflow {job_id}: {e}")
            raise

    def pause_workflow_schedule(self, job_id: str) -> bool:
        """Pause a Cloud Scheduler job.

        Args:
            job_id: Unique identifier for the workflow

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Scheduler is disabled, skipping job pause")
            return False

        try:
            job_path = self._get_job_path(job_id)
            request = scheduler_v1.PauseJobRequest(name=job_path)
            self.client.pause_job(request=request)
            logger.success(f"Paused scheduler job for workflow: {job_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to pause scheduler job for workflow {job_id}: {e}")
            raise

    def resume_workflow_schedule(self, job_id: str) -> bool:
        """Resume a Cloud Scheduler job.

        Args:
            job_id: Unique identifier for the workflow

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Scheduler is disabled, skipping job resume")
            return False

        try:
            job_path = self._get_job_path(job_id)
            request = scheduler_v1.ResumeJobRequest(name=job_path)
            self.client.resume_job(request=request)
            logger.success(f"Resumed scheduler job for workflow: {job_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to resume scheduler job for workflow {job_id}: {e}")
            raise

    def get_workflow_schedule(self, job_id: str):
        """Get a Cloud Scheduler job.

        Args:
            job_id: Unique identifier for the workflow

        Returns:
            The scheduler job object or None if not found
        """
        if not self.enabled:
            return None

        try:
            job_path = self._get_job_path(job_id)
            return self.client.get_job(name=job_path)

        except exceptions.NotFound:
            return None
        except Exception as e:
            logger.error(f"Failed to get scheduler job for workflow {job_id}: {e}")
            raise

    def run_workflow_schedule(self, job_id: str) -> bool:
        """Trigger an immediate execution of a workflow's scheduler job.

        Args:
            job_id: Unique identifier for the workflow

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Scheduler is disabled, skipping job run")
            return False

        try:
            job_path = self._get_job_path(job_id)
            request = scheduler_v1.RunJobRequest(name=job_path)
            self.client.run_job(request=request)
            logger.success(f"Triggered immediate execution for workflow: {job_id}")
            return True

        except exceptions.NotFound:
            logger.error(f"Scheduler job not found for workflow: {job_id}")
            return False
        except Exception as e:
            logger.error(
                f"Failed to trigger immediate execution for workflow {job_id}: {e}"
            )
            return False


scheduler_service = SchedulerService()
