package validator

import (
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)


func RegisteMyValidator(app *gin.Engine){
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterValidation("UserIdExist", UserIdExist)
	}
}

func UserIdExist(fl validator.FieldLevel) bool {
	return true
}