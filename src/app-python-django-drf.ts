import './index.scss';

import { python } from '@codemirror/lang-python';
import { lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, tooltips } from '@codemirror/view';
import { basicSetup } from 'codemirror';

import {
  defUnderlinePlugin,
  languageServer,
} from './codemirror-languageserver';
import { scrollToAndCenterAtPos } from './utils';
import { posToOffset } from './codemirror-languageserver/utils';
// import { languageServer } from './codemirror-languageserver-toph';

/** absolute path to example-project folder */
const exampleProjectRootPath =
  // ''
  'file:///Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-projects/python-django-drf';
const exampleDocPath = 'api/views_backup.py';

const pythonLspClient = languageServer({
  serverUri: 'ws://localhost:3000/python',
  workspaceFolders: [],
  //   workspaceFolders: [
  //     {
  //       name: 'workspace',
  //       uri: 'file://exampleProjectRootPath',
  //     },
  //   ],
  rootUri: exampleProjectRootPath,
  documentUri: exampleProjectRootPath + '/' + exampleDocPath,
  languageId: 'python',

  // @ts-ignore to-implement and improve
  onGoToDefinition: (result) => {
    console.log(';; onGoToDef ', result);
    const selectionRange = result.selectionRange;
    if (
      result.uri === exampleProjectRootPath + '/' + exampleDocPath &&
      selectionRange
    ) {
      const selOffset = posToOffset(view.state.doc, selectionRange.start);
      scrollToAndCenterAtPos(view, selOffset);
    }
  },
  keyboardShortcuts: {
    rename: 'F2', // Default: F2
    goToDefinition: 'ctrlcmd', // Ctrl/Cmd + Click
  },

  // Optional: Allow HTML content in tooltips
  allowHTMLContent: true,
});
// Set up the editor
const doc = `from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from api import models
from api.serializers import UserSerializer, TagSerializer, TopicSerializer
from api.utils.pagination import CustomPagination

def fetch_topics(request, username = None, favor = False):
    if username is not None:
        user = models.User.objects.get(username=username)
    else:
        user = request.user

    favorites = models.User.objects.get(_id=user._id).favorite.all()
    favorite_ids = [f._id for f in favorites]
    var_editor = 'CodeMirror6'
    phrase = ['printed', 'with', 'a', 'dash', 'in', 'between']
    my_name = input('What is your name? ' + phrase[0])
    float_num = float('3.14')
    print("User's favorite topics id: {}\\n".format(favorite_ids))

    if favor:
        topics_all = models.Topic.objects.filter(_id__in=favorite_ids).order_by("-create_at")
        total = len(favorite_ids)
    else:
        topics_all = models.Topic.objects.filter(user=user._id).order_by("-create_at")
        total = models.Topic.objects.filter(user=user._id).count()

    page = CustomPagination()
    topics = page.paginate_queryset(topics_all, request)
    ser_topics = TopicSerializer(topics, many=True)
    ser_user = UserSerializer(user)
    return (page, ser_topics.data, total, ser_user.data)

class TopicListView(APIView):
    """
    GET:
    Return a list of all the topics.

    POST:
    Create a new topic instance.
    """
    permission_classes = [IsAuthenticatedOrReadOnly, ]

    def get(self, request, *args, **kwargs):
        topics_all = models.Topic.objects.all().order_by("-create_at")
        total = models.Topic.objects.count()
        page = CustomPagination()
        topics = page.paginate_queryset(topics_all, request)
        ser = TopicSerializer(topics, many=True)
        return page.get_paginated_response(ser.data, msg="Topics query succeed.", total=total)

    def post(self, request, *args, **kwargs):
        ser = TopicSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            res = { "data": ser.data, "msg": "Topic create succeed." }
            return Response(res)
        else:
            res = { "data": ser.errors, "msg": "Topic create failed." }
            return Response(res)

class UserTopicListView(APIView):
    """
    GET:
    Return a list of user's own topics.
    """
    def get(self, request, *args, **kwargs):
        username = kwargs.get("username")
        (page, data, total, user) = fetch_topics(request, username)
        return page.get_paginated_response(data, msg="User's own topics query succeed.", total=total, user=user)

class FavoriteTopicListView(APIView):
    """
    GET:
    Return a list of user's favorite topics.
    """
    def get(self, request, *args, **kwargs):
        username = kwargs.get("username")
        (page, data, total, user) = fetch_topics(request, username, True)
        return page.get_paginated_response(data, msg="User's favorite topics query succeed.", total=total, user=user)

class TopicDetailView(APIView):
    """
    GET:
    Return a single topic instance.

    PUT:
    Update a topic instance.

    DELETE:
    Delete a topic instance.
    """
    permission_classes = [IsAuthenticatedOrReadOnly, ]

    def get(self, request, *args, **kwargs):
        _id = kwargs.get("_id")
        topic = models.Topic.objects.get(_id=_id)
        ser = TopicSerializer(topic)
        res = { "data": ser.data, "msg": "Topic query succeed." }
        return Response(res)

    def put(self, request, *args, **kwargs):
        _id = kwargs.get("_id")
        topic = models.Topic.objects.get(_id=_id)
        ser = TopicSerializer(topic, data=request.data)
        if ser.is_valid():
            ser.save()
            res = { "data": ser.data, "msg": "Topic update succeed." }
            return Response(res)
        else:
            res = { "data": ser.errors, "msg": "Topic update failed." }
            return Response(ser.errors)

    def delete(self, request, *args, **kwargs):
        _id = kwargs.get("_id")
        topic = models.Topic.objects.get(_id=_id)
        topic.delete()
        res = { "data": None, "msg": "Topic delete succeed." }
        return Response(res)

`;

const maxHeightEditor = EditorView.theme({
  '&': {
    width: '60vw',
    maxHeight: '55vh',
  },
  '.cm-scroller': { overflow: 'auto' },
});
const state = EditorState.create({
  doc,
  extensions: [
    basicSetup,
    maxHeightEditor,
    EditorView.clickAddsSelectionRange.of((event) => event.altKey),
    python(),
    tooltips({
      position: 'absolute',
    }),
    lintGutter(),
    pythonLspClient,
    defUnderlinePlugin(),
  ],
});
const view = new EditorView({
  state,
  parent: document.querySelector('#editor') as Element,
});
