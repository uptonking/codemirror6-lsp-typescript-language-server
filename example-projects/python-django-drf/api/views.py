from rest_framework import status
from rest_framework.permissions import (
    IsAdminUser,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.viewsets import ViewSet
from api.models import Comment, Tag, Topic, User
from api.serializers import (
    CommentReadSerializer,
    CommentWriteSerializer,
    TagSerializer,
    TopicReadSerializer,
    TopicWriteSerializer,
    UserReadSerializer,
    UserWriteSerializer,
)
from api.utils.pagination import CustomPagination
from api.utils.permisson import IsAdminOrOwner, IsAdminOrSelf


@api_view(["GET"])
@permission_classes((IsAuthenticatedOrReadOnly,))
def api_root(request, format=None):
    """
    API root:
    Return a list of most APIs.
    """
    return Response(
        [
            {"topics": reverse("topic-list", request=request, format=format)},
            {"topic-detail": "http://localhost:8000/api/topic/1/"},
            {"topic-favor": "http://localhost:8000/api/topic/1/favor/"},
            {"topic-comment": "http://localhost:8000/api/topic/1/comment/"},
            {"my-settings": reverse("settings", request=request, format=format)},
            {"my-topics": reverse("my-own-topics", request=request, format=format)},
            {"my-favorites": reverse("my-favorite-topics", request=request, format=format)},
            {"users": reverse("user-list", request=request, format=format)},
            {"user-detail": "http://localhost:8000/api/user/admin/"},
            {"user-topics": "http://localhost:8000/api/profile/admin/"},
            {"user-favorites": "http://localhost:8000/api/profile/admin/favorites/"},
            {"tags": reverse("tag-list", request=request, format=format)},
            {"tag-detail": "http://localhost:8000/api/tag/conduit/"},
        ]
    )


def fetch_topics(request, username=None, favor=False):
    if username is not None:
        user = User.objects.get(username=username)
    else:
        user = request.user

    if favor:
        favorites = User.objects.get(_id=user._id).favorites.all()
        favorite_ids = [f._id for f in favorites]
        print("User's favorite topics id: {}\n".format(favorite_ids))
        topics_all = Topic.objects.filter(_id__in=favorite_ids).order_by("-create_at")
        total = len(favorite_ids)
    else:
        topics_all = Topic.objects.filter(user=user._id).order_by("-create_at")
        total = Topic.objects.filter(user=user._id).count()

    page = CustomPagination()
    topics = page.paginate_queryset(topics_all, request)
    ser_topics = TopicReadSerializer(topics, many=True)
    ser_user = UserReadSerializer(user)
    return (page, ser_topics.data, total, ser_user.data)


class CommentViewSet(ViewSet):
    """
    GET list:
    Return a list of all the comments for the specified topic.

    GET retrieve:
    Return the specified comment instance.

    POST create:
    Create a new comment instance for the specified topic, example:
    {
        "content": "This is a comment."
    }

    DELETE destroy:
    Delete the specified comment instance.
    """

    permission_classes = (IsAuthenticated,)

    def get_permissions(self):
        self.permission_classes = (IsAuthenticated,)

        if self.action == "destroy":
            self.permission_classes += (IsAdminOrOwner,)

        return super().get_permissions()

    def list(self, request, pk=None):
        try:
            topic = Topic.objects.get(pk=pk)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})

        comments = topic.comments.all()
        ser = CommentReadSerializer(comments, many=True)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "Topic comments query succeed.",
            }
        )

    def retrieve(self, request, _id=None, pk=None):
        try:
            comment = Comment.objects.get(pk=pk, topic=_id)
        except Comment.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Comment not found."})

        ser = CommentReadSerializer(comment)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "Topic comment query succeed.",
            }
        )

    def create(self, request, pk=None):
        try:
            topic = Topic.objects.get(pk=pk)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})

        request.data["topic"] = pk
        request.data["user"] = request.user._id
        ser = CommentWriteSerializer(data=request.data)
        if not ser.is_valid():
            return Response(
                {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "error": ser.errors,
                    "msg": "Topic comment creation failed.",
                }
            )

        comment = ser.save()
        topic.comments.add(comment)
        return Response(
            {
                "code": status.HTTP_201_CREATED,
                "data": TopicReadSerializer(topic).data,
                "msg": "Topic comment creation succeed.",
            }
        )

    def destroy(self, request, _id=None, pk=None):
        try:
            topic = Topic.objects.get(pk=_id)
            comment = Comment.objects.get(pk=pk, topic=_id)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})
        except Comment.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Comment not found."})

        self.check_object_permissions(request, comment)
        topic.comments.remove(comment)
        comment.delete()
        return Response(
            {
                "code": status.HTTP_204_NO_CONTENT,
                "msg": "Topic comment deletion succeed.",
            }
        )


class TagViewSet(ViewSet):
    """
    GET list:
    Return a list of all the tags.

    GET retrieve:
    Return the specified tag instance.
    """

    permission_classes = (IsAuthenticatedOrReadOnly,)

    def list(self, request):
        tags = Tag.objects.all().order_by("-create_at")
        total = Tag.objects.count()
        ser = TagSerializer(tags, many=True)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "Tags query succeed.",
                "total": total,
            }
        )

    def retrieve(self, request, tag):
        try:
            tag = Tag.objects.get(tag=tag)
        except Tag.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Tag not found."})

        ser = TagSerializer(tag)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "Tag query succeed.",
            }
        )


class TopicViewSet(ViewSet):
    """
    GET list:
    Return a list of all the topics.

    GET retrieve:
    Return the specified topic instance.

    POST create:
    Create a new topic instance and return it.

    PUT update:
    Update a topic instance and return it.

    DELETE destroy:
    Destroy a topic instance.

    GET /api/my-topics/ :
    Return a list of all the topics created by the current user.

    GET /api/my-favorites/ :
    Return a list of all the topics favorited by the current user.

    GET /api/profile/<username>/ :
    Return a list of all the topics created by the specified user.

    GET /api/profile/<username>/favorites/ :
    Return a list of all the topics favorited by the specified user.

    POST /api/topic/<topic_id>/favor/ :
    Favor or unfavor the specified topic.

    Create / Update request JSON example:
    {
        "content": "See how the exact same Medium.com clone (called Conduit) is built using different frontends and backends. Yes, you can mix and match them, because they all adhere to the same API spec",
        "tags": ["React", "API", "Conduit"],
        "title": "Welcome to RealWorld project",
        "user": 1
    }
    """

    permission_classes = (IsAuthenticatedOrReadOnly,)

    def get_permissions(self):
        self.permission_classes = (IsAuthenticatedOrReadOnly,)

        if self.action == "destroy" or self.action == "update":
            self.permission_classes = (
                IsAuthenticated,
                IsAdminOrOwner,
            )
        elif (
            self.action == "my_topics"
            or self.action == "my_favorites"
            or self.action == "user_topics"
            or self.action == "user_favorites"
            or self.action == "favor"
        ):
            self.permission_classes = (IsAuthenticated,)

        return super().get_permissions()

    def list(self, request):
        topics_all = Topic.objects.all().order_by("-create_at")
        total = Topic.objects.count()
        page = CustomPagination()
        topics = page.paginate_queryset(topics_all, request)
        ser = TopicReadSerializer(topics, many=True)
        return page.get_paginated_response(ser.data, msg="Topics query succeed.", total=total)

    def retrieve(self, request, pk=None):
        try:
            topic = Topic.objects.get(pk=pk)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})

        ser = TopicReadSerializer(topic)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "Topic query succeed.",
            }
        )

    def create(self, request):
        tags_str = request.data.pop("tags")
        tags = []
        for tag_str in tags_str:
            tag, _ = Tag.objects.get_or_create(tag=tag_str.lower())
            tags.append(tag._id)
        request.data["tags"] = tags

        ser = TopicWriteSerializer(data=request.data)
        if not ser.is_valid():
            return Response(
                {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "error": ser.errors,
                    "msg": "Topic creation failed.",
                }
            )

        ser.save()
        return Response(
            {
                "code": status.HTTP_201_CREATED,
                "data": ser.data,
                "msg": "Topic creation succeed.",
            }
        )

    def update(self, request, pk=None):
        try:
            topic = Topic.objects.get(pk=pk)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})

        self.check_object_permissions(request, topic)

        tags_str = request.data.pop("tags")
        tags = []
        for tag_str in tags_str:
            tag, _ = Tag.objects.get_or_create(tag=tag_str.lower())
            tags.append(tag._id)
        request.data["tags"] = tags

        ser = TopicWriteSerializer(topic, data=request.data)
        if not ser.is_valid():
            return Response(
                {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "error": ser.errors,
                    "msg": "Topic update failed.",
                }
            )

        ser.save()
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "Topic update succeed.",
            }
        )

    def destroy(self, request, pk=None):
        try:
            topic = Topic.objects.get(pk=pk)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})

        self.check_object_permissions(request, topic)
        topic.delete()
        return Response({"code": status.HTTP_204_NO_CONTENT, "msg": "Topic delete succeed."})

    def my_topics(self, request):
        page, topics, total, user = fetch_topics(request)
        return page.get_paginated_response(
            topics, msg="My own topics query succeed.", total=total, user=user
        )

    def my_favorites(self, request):
        page, topics, total, user = fetch_topics(request, favor=True)
        return page.get_paginated_response(
            topics, msg="My favorite topics query succeed.", total=total, user=user
        )

    def user_topics(self, request, username):
        page, topics, total, user = fetch_topics(request, username)
        msg = "User {}'s own topics query succeed.".format(username)
        return page.get_paginated_response(topics, msg=msg, total=total, user=user)

    def user_favorites(self, request, username):
        page, topics, total, user = fetch_topics(request, username=username, favor=True)
        msg = "User {}'s favorite topics query succeed.".format(username)
        return page.get_paginated_response(topics, msg=msg, total=total, user=user)

    def favor(self, request, pk=None):
        try:
            topic = Topic.objects.get(pk=pk)
        except Topic.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "Topic not found."})

        user = request.user
        if user.favorites.filter(pk=pk).exists():
            user.favorites.remove(topic)
            topic.favorite -= 1
            topic.save()
            msg = "Topic unfavor succeed."
        else:
            user.favorites.add(topic)
            topic.favorite += 1
            topic.save()
            msg = "Topic favor succeed."

        ser = TopicReadSerializer(topic)
        return Response({"code": status.HTTP_200_OK, "data": ser.data, "msg": msg})


class UserViewSet(ViewSet):
    """
    GET list:
    Return a list of all the users.

    GET retrieve:
    Return the specified user instance.

    POST create:
    Create a new user instance and return it, exmaple:
    {
        "email": "test@qq.com",
        "username": "test",
        "password": "123456"
        "confirm_password": "123456"
    }

    PATCH partial_update:
    Partial update a user instance and return it, example:
    {
        "gender": 1,
        "nickname": "Test"
    }

    DELETE destroy:
    Destroy a user instance.

    GET get_settings:
    Retrun the current user instance.

    PUT put_settings:
    Partial update the current user instance and return it, example:
    {
        "gender": 1,
        "nickname": "Test"
    }
    """

    def get_permissions(self):
        self.permission_classes = (IsAuthenticated,)

        if self.action == "destroy":
            self.permission_classes += (IsAdminUser,)
        elif self.action == "update":
            self.permission_classes += (IsAdminOrSelf,)

        return super().get_permissions()

    def list(self, request):
        users_all = User.objects.all().order_by("-create_at")
        total = User.objects.count()
        page = CustomPagination()
        users = page.paginate_queryset(users_all, request)
        ser = UserReadSerializer(users, many=True)
        return page.get_paginated_response(ser.data, msg="Users query succeed.", total=total)

    def retrieve(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "User not found."})

        ser = UserReadSerializer(user)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "User info query succeed.",
            }
        )

    def create(self, request):
        ser = UserWriteSerializer(data=request.data)
        if not ser.is_valid():
            return Response(
                {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "error": ser.errors,
                    "msg": "User create failed.",
                }
            )

        instance = ser.save()
        return Response(
            {
                "code": status.HTTP_201_CREATED,
                "data": UserReadSerializer(instance).data,
                "msg": "User create succeed.",
            }
        )

    def update(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "User not found."})

        self.check_object_permissions(request, user)
        ser = UserWriteSerializer(user, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(
                {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "error": ser.errors,
                    "msg": "User update failed.",
                }
            )

        instance = ser.save()
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": UserReadSerializer(instance).data,
                "msg": "User update succeed.",
            }
        )

    def destroy(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"code": status.HTTP_404_NOT_FOUND, "msg": "User not found."})

        user.delete()
        return Response({"code": status.HTTP_204_NO_CONTENT, "msg": "User delete succeed."})

    def get_settings(self, request):
        user = request.user
        ser = UserReadSerializer(user)
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": ser.data,
                "msg": "My settings query succeed.",
            }
        )

    def put_settings(self, request):
        user = request.user
        ser = UserWriteSerializer(user, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(
                {
                    "code": status.HTTP_400_BAD_REQUEST,
                    "error": ser.errors,
                    "msg": "User settings update failed.",
                }
            )

        instance = ser.save()
        return Response(
            {
                "code": status.HTTP_200_OK,
                "data": UserReadSerializer(instance).data,
                "msg": "My settings update succeed.",
            }
        )
