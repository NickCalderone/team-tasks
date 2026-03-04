from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import Membership


class IsTaskTeamMemberWithRoleRules(BasePermission):
    """
    - Team members can read tasks in their team.
    - Team managers/admins can create/update/delete team tasks.
    - Members can update tasks assigned to themselves.
    """

    elevated_roles = {Membership.Role.MANAGER, Membership.Role.ADMIN}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        if view.action == "create":
            team_id = request.data.get("team")
            if not team_id:
                return False

            membership = Membership.objects.filter(user=request.user, team_id=team_id).first()
            return bool(membership and membership.role in self.elevated_roles)

        return True

    def has_object_permission(self, request, view, obj):
        membership = Membership.objects.filter(user=request.user, team=obj.team).first()
        if not membership:
            return False

        if request.method in SAFE_METHODS:
            return True

        if membership.role in self.elevated_roles:
            return True

        return request.method in {"PUT", "PATCH"} and obj.assignee_id == request.user.id
