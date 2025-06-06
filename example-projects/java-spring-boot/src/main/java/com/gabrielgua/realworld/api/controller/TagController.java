package com.gabrielgua.realworld.api.controller;

import com.gabrielgua.realworld.api.assembler.TagAssembler;
import com.gabrielgua.realworld.api.model.tag.TagListResponse;
import com.gabrielgua.realworld.api.security.authorization.CheckSecurity;
import com.gabrielgua.realworld.domain.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;
    private final TagAssembler tagAssembler;

    @GetMapping
    @CheckSecurity.Public.canRead
    public TagListResponse list() {
        System.out.println(";; TagController.list()");
        return tagAssembler.toCollectionResponse(tagService.listAll());
    }
}
