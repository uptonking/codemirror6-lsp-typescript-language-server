package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func ErrorHandler(c *gin.Context) {
	defer func() {
		if err := recover(); err != nil {
			fmt.Println("error =>", err)
			c.JSON(500, gin.H{
				"msg": "server internal error!",
			})
			c.Abort()
		}
	}()
	c.Next()
}