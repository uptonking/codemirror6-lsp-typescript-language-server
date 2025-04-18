package main

import (
	"fmt"
	"net/http"

	"github.com/examples-hub/realworld-gin-gorm/middleware"
	"github.com/examples-hub/realworld-gin-gorm/models"
	"github.com/examples-hub/realworld-gin-gorm/router"
	"github.com/examples-hub/realworld-gin-gorm/validator"
	"github.com/gin-gonic/gin"
)

func main() {
	// config.InitConfig()
	models.InitDB()

	app := gin.Default()

	middleware.LoadMiddleware(app)
	validator.RegisterMyValidator(app)
	router.LoadRouter(app)

	app.GET("/ping", func(c *gin.Context) {
		fmt.Println("/ping route ing")
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	// addr := viper.GetString("serverAddr")
	// r.Run(addr)
	app.Run()
}
