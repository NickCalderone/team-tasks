from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Membership, Team
from tasks.models import Task


class TaskApiPermissionTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin_user = user_model.objects.create_user(username="admin", password="pass12345")
        self.member_user = user_model.objects.create_user(username="member", password="pass12345")
        self.outsider_user = user_model.objects.create_user(username="outsider", password="pass12345")

        self.team = Team.objects.create(name="Core Team")
        self.other_team = Team.objects.create(name="Other Team")

        Membership.objects.create(user=self.admin_user, team=self.team, role=Membership.Role.ADMIN)
        Membership.objects.create(user=self.member_user, team=self.team, role=Membership.Role.MEMBER)
        Membership.objects.create(user=self.outsider_user, team=self.other_team, role=Membership.Role.ADMIN)

        self.task = Task.objects.create(
            team=self.team,
            title="Initial task",
            description="Seed task",
            status=Task.Status.TODO,
            created_by=self.admin_user,
            assignee=self.member_user,
            due_date=date.today() + timedelta(days=7),
        )

    def test_list_returns_only_tasks_for_users_teams(self):
        Task.objects.create(
            team=self.other_team,
            title="Other team task",
            description="Should be hidden",
            status=Task.Status.TODO,
            created_by=self.outsider_user,
        )

        self.client.force_authenticate(user=self.member_user)
        response = self.client.get(reverse("task-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.task.id)

    def test_member_cannot_create_task(self):
        self.client.force_authenticate(user=self.member_user)
        payload = {
            "team": self.team.id,
            "title": "Member created task",
            "description": "Not allowed",
            "status": Task.Status.TODO,
        }

        response = self.client.post(reverse("task-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_task(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "team": self.team.id,
            "title": "Admin created task",
            "description": "Allowed",
            "status": Task.Status.TODO,
            "assignee": self.member_user.id,
        }

        response = self.client.post(reverse("task-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_by"], self.admin_user.id)

    def test_member_can_patch_task_assigned_to_self(self):
        self.client.force_authenticate(user=self.member_user)
        response = self.client.patch(
            reverse("task-detail", kwargs={"pk": self.task.id}),
            {"status": Task.Status.IN_PROGRESS},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, Task.Status.IN_PROGRESS)

    def test_member_cannot_patch_task_not_assigned_to_self(self):
        self.task.assignee = self.admin_user
        self.task.save(update_fields=["assignee"])

        self.client.force_authenticate(user=self.member_user)
        response = self.client.patch(
            reverse("task-detail", kwargs={"pk": self.task.id}),
            {"status": Task.Status.DONE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_delete_task(self):
        self.client.force_authenticate(user=self.member_user)
        response = self.client.delete(reverse("task-detail", kwargs={"pk": self.task.id}))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
