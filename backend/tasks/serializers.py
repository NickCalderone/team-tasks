from rest_framework import serializers

from accounts.models import Membership

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "team",
            "title",
            "description",
            "status",
            "created_by",
            "assignee",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context["request"]
        team = attrs.get("team") or getattr(self.instance, "team", None)
        assignee = attrs.get("assignee")

        if team and not Membership.objects.filter(user=request.user, team=team).exists():
            raise serializers.ValidationError({"team": "You must be a member of this team."})

        if assignee and team and not Membership.objects.filter(user=assignee, team=team).exists():
            raise serializers.ValidationError({"assignee": "Assignee must be a member of the selected team."})

        return attrs
