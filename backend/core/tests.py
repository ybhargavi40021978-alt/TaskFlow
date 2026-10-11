import json
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from core.models import Project, ProjectMembership, Task, Comment, Notification

User = get_user_model()


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_user_registration(self):
        payload = {
            "full_name": "Alice Johnson",
            "email": "alice@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertTrue(User.objects.filter(email="alice@example.com").exists())

    def test_duplicate_email_registration_rejected(self):
        User.objects.create_user(username="bob", email="bob@example.com", password="Password123!")
        payload = {
            "full_name": "Bob Duplicate",
            "email": "bob@example.com",
            "password": "Password123!",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success_and_failure(self):
        user = User.objects.create_user(
            username="carol", email="carol@example.com", password="SecretPassword123!"
        )
        Token.objects.create(user=user)

        # Successful login
        success_res = self.client.post("/api/auth/login/", {
            "email": "carol@example.com",
            "password": "SecretPassword123!"
        }, format="json")
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        self.assertIn("token", success_res.data)

        # Invalid password
        fail_res = self.client.post("/api/auth/login/", {
            "email": "carol@example.com",
            "password": "WrongPassword"
        }, format="json")
        self.assertEqual(fail_res.status_code, status.HTTP_400_BAD_REQUEST)


class ProjectAndTaskCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="Password123!", display_name="User One"
        )
        self.token1 = Token.objects.create(user=self.user1)

        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="Password123!", display_name="User Two"
        )
        self.token2 = Token.objects.create(user=self.user2)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1.key}")

    def test_unauthorized_access_rejected(self):
        unauth_client = APIClient()
        res = unauth_client.get("/api/projects/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_project_crud(self):
        # Create Project
        res = self.client.post("/api/projects/", {
            "name": "Apollo Redesign",
            "description": "Redesign Apollo system",
            "color": "blue",
            "status": "Active"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        project_id = res.data["id"]

        # User 1 can see it
        list_res = self.client.get("/api/projects/")
        self.assertEqual(len(list_res.data), 1)

        # User 2 cannot see User 1's private project
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token2.key}")
        list_res_u2 = self.client.get("/api/projects/")
        self.assertEqual(len(list_res_u2.data), 0)

        # Switch back to User 1
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1.key}")
        # Add User 2 as project member
        add_member_res = self.client.post(f"/api/projects/{project_id}/members/", {
            "user_id": self.user2.id,
            "role": "member"
        }, format="json")
        self.assertEqual(add_member_res.status_code, status.HTTP_201_CREATED)

        # Now User 2 can see the project
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token2.key}")
        list_res_u2_after = self.client.get("/api/projects/")
        self.assertEqual(len(list_res_u2_after.data), 1)

    def test_task_crud_and_notification(self):
        project = Project.objects.create(name="Mobile App", owner=self.user1)
        ProjectMembership.objects.create(project=project, user=self.user1, role="owner")
        ProjectMembership.objects.create(project=project, user=self.user2, role="member")

        # Create Task assigned to User 2
        res = self.client.post("/api/tasks/", {
            "project": project.id,
            "title": "Build Navigation Drawer",
            "description": "Implement responsive mobile drawer",
            "assignee": self.user2.id,
            "priority": "High",
            "status": "To Do"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        task_id = res.data["id"]

        # Check notification was created for User 2
        self.assertTrue(Notification.objects.filter(recipient=self.user2, related_task_id=task_id).exists())

        # User 2 adds a comment
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token2.key}")
        comment_res = self.client.post(f"/api/tasks/{task_id}/comments/", {
            "content": "Working on this now!"
        }, format="json")
        self.assertEqual(comment_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.filter(task_id=task_id).count(), 1)

    def test_dashboard_summary_metrics(self):
        project = Project.objects.create(name="Web Platform", owner=self.user1)
        ProjectMembership.objects.create(project=project, user=self.user1, role="owner")
        Task.objects.create(project=project, title="T1", creator=self.user1, status="In Progress", assignee=self.user1)
        Task.objects.create(project=project, title="T2", creator=self.user1, status="Completed", assignee=self.user1)

        res = self.client.get("/api/dashboard/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_projects"], 1)
        self.assertEqual(res.data["total_tasks"], 2)
        self.assertEqual(res.data["in_progress_tasks"], 1)
        self.assertEqual(res.data["completed_tasks"], 1)
        self.assertEqual(res.data["my_tasks_count"], 2)


class DeduplicationAndIntegrityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="testuser@example.com", password="Password123!"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.project = Project.objects.create(name="Alpha Project", owner=self.user)
        ProjectMembership.objects.create(project=self.project, user=self.user, role="owner")

    def test_task_creation_deduplication(self):
        # First submission
        res1 = self.client.post("/api/tasks/", {
            "project": self.project.id,
            "title": "Refactor Database Schema",
            "priority": "High"
        }, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Fast accidental double-click submission with same title
        res2 = self.client.post("/api/tasks/", {
            "project": self.project.id,
            "title": "Refactor Database Schema",
            "priority": "High"
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data["id"], res2.data["id"])

        # Total tasks in DB must be exactly 1
        self.assertEqual(Task.objects.filter(project=self.project, title="Refactor Database Schema").count(), 1)

    def test_notification_deduplication(self):
        from core.services import create_and_send_notification
        actor = User.objects.create_user(username="actor1", email="actor1@example.com", password="Password123!")
        # First notification
        n1 = create_and_send_notification(
            recipient=self.user,
            actor=actor,
            notification_type="general",
            message="Welcome to TaskFlow!",
            related_project=self.project
        )
        self.assertIsNotNone(n1)

        # Immediate duplicate notification for same event
        n2 = create_and_send_notification(
            recipient=self.user,
            actor=actor,
            notification_type="general",
            message="Welcome to TaskFlow!",
            related_project=self.project
        )
        # Must return the existing notification without creating a second record
        self.assertEqual(n1.id, n2.id)
        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)

    def test_cleanup_duplicates_command(self):
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command("cleanup_duplicates", "--dry-run", stdout=out)
        output = out.getvalue()
        self.assertIn("TaskFlow Database Duplicate Cleanup", output)
        self.assertIn("Total potential duplicates detected: 0", output)


