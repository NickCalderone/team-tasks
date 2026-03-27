from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class WhoAmITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="pass12345",
        )

    def test_requires_authentication(self):
        response = self.client.get(reverse("whoami"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_authenticated_user_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("whoami"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertIn("is_staff", response.data)
        self.assertIn("is_superuser", response.data)
