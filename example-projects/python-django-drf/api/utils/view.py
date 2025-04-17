from rest_framework.views import APIView

class OrPermissionView(APIView):

    def check_permissions(self, request):
        for permission in self.get_permissions():
            if permission.has_permission(request, self):
                return True
        else:
            self.permission_denied(
                    request,
                    message=getattr(permission, 'message', None),
                    code=getattr(permission, 'code', None)
                )
