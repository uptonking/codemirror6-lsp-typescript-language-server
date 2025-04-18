package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func LoadMiddleware(app *gin.Engine){
	app.Use(ErrorHandler)
	app.Use(cors.Default())
}