from django.urls import path, re_path
from api import views

urlpatterns = [
    path("", views.api_root),
    path(
        "topics/",
        views.TopicViewSet.as_view({"get": "list", "post": "create"}),
        name="topic-list",
    ),
    re_path(
        r"^topic/(?P<pk>\d+)/$",
        views.TopicViewSet.as_view({"delete": "destroy", "get": "retrieve", "put": "update"}),
        name="topic-detail",
    ),
    path(
        "my-topics/",
        views.TopicViewSet.as_view({"get": "my_topics"}),
        name="my-own-topics",
    ),
    path(
        "my-favorites/",
        views.TopicViewSet.as_view({"get": "my_favorites"}),
        name="my-favorite-topics",
    ),
    path(
        "profile/<str:username>/",
        views.TopicViewSet.as_view({"get": "user_topics"}),
        name="user-own-topics",
    ),
    path(
        "profile/<str:username>/favorites/",
        views.TopicViewSet.as_view({"get": "user_favorites"}),
        name="user-favorite-topics",
    ),
    re_path(
        r"^topic/(?P<pk>\d+)/favor/$",
        views.TopicViewSet.as_view({"post": "favor"}),
        name="topic-favor",
    ),
    re_path(
        r"^topic/(?P<pk>\d+)/comment/$",
        views.CommentViewSet.as_view({"get": "list", "post": "create"}),
        name="topic-comment",
    ),
    re_path(
        r"^topic/(?P<_id>\d+)/comment/(?P<pk>\d+)/$",
        views.CommentViewSet.as_view({"delete": "destroy", "get": "retrieve"}),
        name="topic-comment",
    ),
    path("tags/", views.TagViewSet.as_view({"get": "list"}), name="tag-list"),
    path("tag/<str:tag>/", views.TagViewSet.as_view({"get": "retrieve"}), name="tag-detail"),
    path(
        "users/",
        views.UserViewSet.as_view({"get": "list", "post": "create"}),
        name="user-list",
    ),
    path(
        "user/<str:username>/",
        views.UserViewSet.as_view({"delete": "destroy", "get": "retrieve", "put": "update"}),
        name="user-detail",
    ),
    path(
        "settings/",
        views.UserViewSet.as_view({"get": "get_settings", "put": "put_settings"}),
        name="settings",
    ),
]
