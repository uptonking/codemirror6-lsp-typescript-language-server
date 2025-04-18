package controller

import (
	"net/http"
	"strconv"

	"github.com/examples-hub/realworld-gin-gorm/models"
	"github.com/gin-gonic/gin"
)

func GetArticles(ctx *gin.Context) {
	tag := ctx.Query("tag")
	author := ctx.Query("author")
	favorited := ctx.Query("favorited")
	offset := ctx.Query("offset")
	limit := ctx.Query("limit")

	articles, count, err := models.FindArticles(tag, author, favorited, offset, limit)
	if err != nil {
		panic(err)
	}

	ctx.JSON(200, gin.H{
		"articles":      articles,
		"articlesCount": count,
	})
}

func GetFeedArticles(ctx *gin.Context) {
	offset := ctx.Query("offset")
	limit := ctx.Query("limit")

	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)

	articles, count, err := user.GetFeedArticles(offset, limit)
	if err != nil {
		panic(err)
	}

	ctx.JSON(200, gin.H{
		"articles":      articles,
		"articlesCount": count,
	})
}

func GetArticle(ctx *gin.Context) {
	articleId := ctx.Param("articleId")

	article, err := models.FindArticleById(articleId)
	if err != nil {
		panic(err)
	}

	ctx.JSON(200, gin.H{
		"article": article,
	})
}

func CreateArticle(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)

	var createArticleReqBody struct {
		Article struct {
			Title       string   `json:"title"`
			Description string   `json:"description"`
			Body        string   `json:"body"`
			TagList     []string `json:"tagList"`
		} `json:"article"`
	}

	err := ctx.ShouldBind(&createArticleReqBody)
	if err != nil {
		panic(err)
	}

	article, err := models.CreateArticle(
		user.ID,
		createArticleReqBody.Article.Title,
		createArticleReqBody.Article.Description,
		createArticleReqBody.Article.Body,
		createArticleReqBody.Article.TagList,
	)
	if err != nil {
		panic(err)
	}

	ctx.JSON(200, gin.H{
		"article": article,
	})
}

func DeleteArticle(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)

	var articleId = ctx.Param("articleId")
	if !user.HasArticle(articleId) {
		ctx.JSON(http.StatusForbidden, gin.H{
			"message": "not allowed!",
		})
	}
	models.DeleteArticleById(articleId)
	ctx.Status(204)
}

func UpdateArticle(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)

	var articleId = ctx.Param("articleId")
	var updateArticleReqBody struct {
		Article struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Body        string `json:"body"`
		} `json:"article"`
	}
	err := ctx.ShouldBind(&updateArticleReqBody.Article)
	if err != nil {
		panic(err)
	}

	if !user.HasArticle(articleId) {
		ctx.JSON(http.StatusForbidden, gin.H{
			"message": "not allowed!",
		})
	}
	article, _ := models.FindArticleById(articleId)
	models.UpdateArticle(article, &models.Article{
		Title:       updateArticleReqBody.Article.Title,
		Description: updateArticleReqBody.Article.Description,
		Body:        updateArticleReqBody.Article.Body,
	})

	ctx.JSON(200, gin.H{
		"article": article,
	})
}

func CreateComment(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)
	articleId, _ := strconv.Atoi(ctx.Param("articleId"))

	var createCommentBody struct {
		Comment struct {
			Body string
		}
	}
	ctx.ShouldBind(&createCommentBody)
	comment, _ := models.CreateComment(user.ID, uint(articleId), createCommentBody.Comment.Body)

	ctx.JSON(201, gin.H{
		"comment": comment,
	})
}

func DeleteComment(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)
	var commentId = ctx.Param("commentId")
	if !user.HasComment(commentId) {
		ctx.JSON(http.StatusForbidden, gin.H{
			"message": "not allowed!",
		})
	}
	models.DeleteCommentById(commentId)
	ctx.Status(204)
}

func GetComments(ctx *gin.Context) {
	var articleId = ctx.Param("articleId")
	article, err := models.FindArticleById(articleId)
	if err != nil {
		panic(err)
	}
	comments, _ := article.GetComments()
	ctx.JSON(200, gin.H{
		"comments": comments,
	})
}

func Favorite(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)
	article, err := models.FindArticleById(ctx.Param("articleId"))
	if err != nil {
		panic(err)
	}
	user.Favorite(article)
	ctx.JSON(200, gin.H{
		"article": article,
	})
}

func UnFavorite(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)
	article, err := models.FindArticleById(ctx.Param("articleId"))
	if err != nil {
		panic(err)
	}
	user.UnFavorite(article)
	ctx.JSON(200, gin.H{
		"article": article,
	})
}
