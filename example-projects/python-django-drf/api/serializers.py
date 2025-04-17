from typing import Any, Dict
from rest_framework.serializers import (
    CharField,
    ModelSerializer,
    PrimaryKeyRelatedField,
    StringRelatedField,
    ValidationError,
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from api.models import Comment, Tag, Topic, User
from api.utils.hook import HookSerializer


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        return token

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, str]:
        default_data = super().validate(attrs)
        res = {
            "access": default_data["access"],
            "msg": "Login succeed.",
            "refresh": default_data["refresh"],
            "user": UserReadSerializer(self.user).data,
        }
        return res


class UserReadSerializer(HookSerializer, ModelSerializer):
    favorites = PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = User
        # fields = "__all__"
        exclude = [
            "groups",
            "is_staff",
            "is_superuser",
            "password",
            "user_permissions",
        ]
        extra_kwargs = {
            "create_at": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
            "last_login": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
            "update_at": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
        }

    def hk_gender(self, obj):
        return obj.get_gender_display()


class UserWriteSerializer(ModelSerializer):
    confirm_password = CharField(max_length=128)

    class Meta:
        model = User
        fields = "__all__"
        extra_kwargs = {
            "is_staff": {"read_only": True},
        }

    def validate_email(self, value: str) -> str:
        if self.instance:
            if self.instance.email != value:
                raise ValidationError("E-mail can't be changed.")
        else:
            if User.objects.filter(email=value).exists():
                raise ValidationError("E-mail already exists.")
        return value

    def validate_username(self, value: str) -> str:
        if self.instance:
            if self.instance.username != value:
                raise ValidationError("Username can't be changed.")
        else:
            if User.objects.filter(username=value).exists():
                raise ValidationError("Username already exists.")
        return value

    def validate_confirm_password(self, value: str) -> str:
        if value != self.initial_data["password"]:
            raise ValidationError("Passwords don't match.")
        return value

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        user = super().create(validated_data)
        user.set_password(validated_data["password"])
        user.save()
        return user


class TagSerializer(ModelSerializer):
    class Meta:
        model = Tag
        fields = "__all__"
        extra_kwargs = {
            "create_at": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
        }


class CommentReadSerializer(ModelSerializer):
    user = UserReadSerializer()

    class Meta:
        model = Comment
        fields = "__all__"
        extra_kwargs = {
            "create_at": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
            "topic": {"write_only": True},
        }


class CommentWriteSerializer(ModelSerializer):
    class Meta:
        model = Comment
        fields = "__all__"


class TopicReadSerializer(ModelSerializer):
    comments = CommentReadSerializer(many=True, read_only=True)
    tags = StringRelatedField(many=True)
    user = UserReadSerializer()

    class Meta:
        model = Topic
        fields = "__all__"
        extra_kwargs = {
            "create_at": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
            "update_at": {"format": "%Y-%m-%d %H:%M:%S", "read_only": True},
        }


class TopicWriteSerializer(ModelSerializer):
    class Meta:
        model = Topic
        fields = ["content", "tags", "title", "user"]
