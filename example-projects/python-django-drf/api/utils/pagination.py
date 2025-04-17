from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "size"
    max_page_size = 100

    def get_paginated_response(self, data, *args, **kwargs):
        msg = kwargs.get("msg")
        total = kwargs.get("total")
        res = {
            "code": status.HTTP_200_OK,
            "count": self.page.paginator.count,
            "data": data,
            "msg": msg,
            "next": self.get_next_link(),
            "prev": self.get_previous_link(),
            "total": total,
        }

        user = kwargs.get("user")
        if user:
            res["user"] = user

        return Response(res)
