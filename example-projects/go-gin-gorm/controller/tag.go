package controller

import (
	"github.com/examples-hub/realworld-gin-gorm/models"
	"github.com/gin-gonic/gin"
)

func GetTags(ctx *gin.Context) {
	tags, _ := models.FindTags()
	result := []string{}
	for _, tag := range *tags {
		result = append(result, tag.Name)
	}
	ctx.JSON(200, result)
}
