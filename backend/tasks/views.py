from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Task
from .permissions import IsTaskTeamMemberWithRoleRules
from .serializers import TaskSerializer


class TaskViewSet(ModelViewSet):
	serializer_class = TaskSerializer
	permission_classes = [IsAuthenticated, IsTaskTeamMemberWithRoleRules]

	def get_queryset(self):
		user = self.request.user
		return (
			Task.objects.filter(team__memberships__user=user)
			.select_related("team", "created_by", "assignee")
			.distinct()
		)

	def perform_create(self, serializer):
		serializer.save(created_by=self.request.user)
