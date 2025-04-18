package router

import (
	"github.com/examples-hub/realworld-gin-gorm/controller"
	"github.com/examples-hub/realworld-gin-gorm/middleware"
	"github.com/gin-gonic/gin"
)

func LoadRouter(r *gin.Engine) {
	api := r.Group("/api")
	LoadUserRouter(api)
	LoadArticleRouter(api)
	LoadProfileRouter(api)
	LoadTagRouter(api)

	r.NoRoute(func(ctx *gin.Context) {
		ctx.JSON(404, gin.H{
			"message": "not found!",
		})
	})
}

func LoadUserRouter(r *gin.RouterGroup) {
	r.POST("/users", controller.Register)
	r.POST("/users/login", controller.Login)
	r.GET("/user", middleware.Auth, controller.GetCurrentUser)
	r.PUT("/user", middleware.Auth, controller.UpdateUserInfo)
}

func LoadProfileRouter(r *gin.RouterGroup) {
	r.GET("/profiles/:userId", controller.GetProfile)
	r.POST("/profiles/:userId/follow", middleware.Auth, controller.Follow)
	r.DELETE("/profiles/:userId/follow", middleware.Auth, controller.UnFollow)
}

func LoadTagRouter(r *gin.RouterGroup) {
	r.GET("/tags", controller.GetTags)
}

func LoadArticleRouter(r *gin.RouterGroup) {
	r.GET("/articles", controller.GetArticles)
	r.GET("/articles/:articleId", controller.GetArticle)
	r.POST("/articles/:articleId", middleware.Auth, controller.CreateArticle)
	r.PUT("/articles/:articleId", middleware.Auth, controller.UpdateArticle)
	r.DELETE("/articles/:articleId", middleware.Auth, controller.DeleteArticle)
	r.GET("/articles/feed", middleware.Auth, controller.GetFeedArticles)

	r.GET("/articles/:articleId/comments", controller.GetComments)
	r.POST("/articles/:articleId/comments", middleware.Auth, controller.CreateComment)
	r.DELETE("/articles/:articleId/comments", middleware.Auth, controller.DeleteComment)

	r.POST("/articles/:articleId/favorite", middleware.Auth, controller.Favorite)
	r.DELETE("/articles/:articleId/favorite", middleware.Auth, controller.UnFavorite)
}
