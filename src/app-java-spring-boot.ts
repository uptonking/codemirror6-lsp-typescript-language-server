import './index.scss';

import { java } from '@codemirror/lang-java';
import { lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, tooltips } from '@codemirror/view';
import { basicSetup } from 'codemirror';

import {
  defUnderlinePlugin,
  languageServer,
} from './codemirror-languageserver';
import { posToOffset } from './codemirror-languageserver/utils';
import { scrollToAndCenterAtPos } from './utils';
// import { languageServer } from './codemirror-languageserver-toph';

/** absolute path to example-project folder */
const exampleProjectRootPath =
  // '/home/yaoo/Documents/repos/resources/codemirror6-lsp-typescript-language-server/example-projects/ts-js';
  // ''
  'file:///Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-projects/java-spring-boot';
const exampleDocPath =
  'src/main/java/com/gabrielgua/realworld/api/controller/TagController.java';

const javaLspClient = languageServer({
  // serverUri: 'ws://localhost:3000/java',
  serverUri: 'ws://localhost:4000',
  // serverUri: 'ws://localhost:3000',
  workspaceFolders: [],
  //   workspaceFolders: [
  //     {
  //       name: 'workspace',
  //       uri: 'file://exampleProjectRootPath',
  //     },
  //   ],
  rootUri: exampleProjectRootPath,
  documentUri: exampleProjectRootPath + '/' + exampleDocPath,
  languageId: 'java',

  // @ts-ignore to-implement and improve
  onGoToDefinition: (result) => {
    const selectionRange = result.selectionRange;
    const resultUriPath = result.uri.startsWith('file://')
      ? result.uri.slice(7)
      : result.uri;
    console.log(
      ';; onGoToDef ',
      resultUriPath === exampleProjectRootPath + '/' + exampleDocPath &&
        selectionRange,
      resultUriPath,
      exampleProjectRootPath + '/' + exampleDocPath,
      result,
    );
    if (
      resultUriPath ===
        exampleProjectRootPath.slice(7) + '/' + exampleDocPath &&
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
const doc = `package com.gabrielgua.realworld.api.controller;

import com.gabrielgua.realworld.api.assembler.ArticleAssembler;
import com.gabrielgua.realworld.api.model.article.ArticleWrapper;
import com.gabrielgua.realworld.api.model.article.ArticleRegister;
import com.gabrielgua.realworld.api.model.article.ArticleResponse;
import com.gabrielgua.realworld.api.model.article.ArticleUpdate;
import com.gabrielgua.realworld.api.security.AuthUtils;
import com.gabrielgua.realworld.api.security.authorization.CheckSecurity;
import com.gabrielgua.realworld.domain.model.Tag;
import com.gabrielgua.realworld.domain.service.ArticleService;
import com.gabrielgua.realworld.domain.service.TagService;
import com.gabrielgua.realworld.domain.service.UserService;
import com.gabrielgua.realworld.infra.spec.ArticleSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/articles")
public class ArticleController {

    private final AuthUtils authUtils;
    private final TagService tagService;
    private final UserService userService;
    private final ArticleService articleService;
    private final ArticleAssembler articleAssembler;

    private static final String DEFAULT_FILTER_LIMIT = "20";
    private static final String DEFAULT_FILTER_OFFSET = "0";
    private static final Sort DEFAULT_FILTER_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    @GetMapping
    @CheckSecurity.Public.canRead
    public ArticleWrapper getAll(
            ArticleSpecification filter,
            @RequestParam(required = false, defaultValue = DEFAULT_FILTER_LIMIT) int limit,
            @RequestParam(required = false, defaultValue = DEFAULT_FILTER_OFFSET) int offset) {


        Pageable pageable = PageRequest.of(offset, limit, DEFAULT_FILTER_SORT);
        var articles = articleService.listAll(filter, pageable).getContent();
        System.out.println(";; TagController.list()");

        if (authUtils.isAuthenticated()) {
            var profile = userService.getCurrentUser().getProfile();
            return articleAssembler.toCollectionModel(profile, articles);
        }

        return articleAssembler.toCollectionModel(articles);
    }

    @GetMapping("/feed")
    @CheckSecurity.Public.canRead
    public ArticleWrapper getFeed(
            @RequestParam(required = false, defaultValue = DEFAULT_FILTER_LIMIT) int limit,
            @RequestParam(required = false, defaultValue = DEFAULT_FILTER_OFFSET) int offset
    ) {

        var profile = userService.getCurrentUser().getProfile();
        Pageable pageable = PageRequest.of(offset, limit, DEFAULT_FILTER_SORT);
        var articles = articleService.getFeedByUser(profile, pageable);

        return articleAssembler.toCollectionModel(profile, articles);
    }


    @GetMapping("/{slug}")
    @CheckSecurity.Public.canRead
    public ArticleResponse getBySlug(@PathVariable String slug) {
        var article = articleService.getBySlug(slug);

        if (authUtils.isAuthenticated()) {
            var profile = userService.getCurrentUser().getProfile();
            return articleAssembler.toResponse(profile, article);
        }

        return articleAssembler.toResponse(article);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @CheckSecurity.Protected.canManage
    public ArticleResponse save(@RequestBody ArticleRegister register) {
        var profile = userService.getCurrentUser().getProfile();

        List<Tag> tags = new ArrayList<>();
        if (register.getTagList() != null) {
            tags = tagService.saveAll(register.getTagList().stream().toList());
        }

        var article = articleAssembler.toEntity(register);
        return articleAssembler.toResponse(profile, articleService.save(article, profile, tags));
    }

    @PutMapping("/{slug}")
    @CheckSecurity.Articles.canManage
    public ArticleResponse update(@PathVariable String slug, @RequestBody ArticleUpdate update) {
        var article = articleService.getBySlug(slug);
        articleAssembler.copyToEntity(update, article);

        return articleAssembler.toResponse(articleService.save(article));
    }

    @DeleteMapping("/{slug}")
    @CheckSecurity.Articles.canManage
    public void delete(@PathVariable String slug) {
        var article = articleService.getBySlug(slug);
        articleService.delete(article);
    }

}

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
    java(),
    tooltips({
      position: 'absolute',
    }),
    lintGutter(),
    javaLspClient,
    defUnderlinePlugin(),
    // languageServerWithClient({
    //   client: new LanguageServerClient({
    //     rootUri: 'file:///',
    //     workspaceFolders: [],
    //     transport: mockTransport,
    //   }),
    //   allowHTMLContent: true,
    //   documentUri: 'file:///example.ts',
    //   languageId: 'typescript',
    //   onGoToDefinition: (result) => {
    //     console.log('Go to definition', result);
    //   },
    // }),
  ],
});
const view = new EditorView({
  state,
  parent: document.querySelector('#editor') as Element,
});

window['edd'] = view;
