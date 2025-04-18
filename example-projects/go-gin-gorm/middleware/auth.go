package middleware

import (
	"github.com/examples-hub/realworld-gin-gorm/models"
	"github.com/examples-hub/realworld-gin-gorm/utils"
	"github.com/gin-gonic/gin"
)

func Auth(c *gin.Context) {
	BearerToken := c.Request.Header.Get("Authorization")[7:]

	id, err := utils.ParseToken(BearerToken)
	if err != nil {
		c.AbortWithStatusJSON(401, gin.H{
			"message": "jwt auth fail",
			"detail":  err.Error(),
		})
		return
	}

	var user models.User
	models.DB.First(&user, id)
	if user.ID == 0 {
		c.AbortWithStatusJSON(401, gin.H{
			"message": "invalid token!",
		})
		return
	}
	c.Set("user", user)
	c.Next()
}
