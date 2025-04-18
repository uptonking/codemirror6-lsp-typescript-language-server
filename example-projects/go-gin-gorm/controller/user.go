package controller

import (
	"github.com/examples-hub/realworld-gin-gorm/models"
	"github.com/examples-hub/realworld-gin-gorm/utils"
	"github.com/gin-gonic/gin"
)

func Register(ctx *gin.Context) {

	// 1. validate request
	var registerBody struct {
		User struct {
			Email    string `json:"email" binding:"required"`
			Username string `json:"username" binding:"required"`
			Password string `json:"password" binding:"required"`
		} `json:"user"`
	}
	if err := ctx.ShouldBind(&registerBody); err != nil {
		ctx.JSON(422, gin.H{
			"message": "参数校验失败",
			"detail":  err.Error(),
		})
		return
	}

	// 2. validate email
	user, _ := models.FindUserByEmail(registerBody.User.Email)
	if user.ID != 0 {
		ctx.JSON(400, gin.H{
			"message": "email has been register!",
		})
		return
	}

	// 3. create user
	newUser, err := models.CreateUser(registerBody.User.Username, registerBody.User.Password, "", "", registerBody.User.Email)
	if err != nil {
		panic("创建数据失败 =>" + err.Error())
	}

	// 4. generate token
	token, err := utils.GenToken(newUser.ID)
	if err != nil {
		panic("生成token失败" + err.Error())
	}

	// 5. response
	ctx.JSON(200, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"bio":      user.Bio,
			"image":    user.Image,
			"token":    token,
		},
	})
}

func Login(ctx *gin.Context) {

	// 1. validate request body
	var loginBody struct {
		User struct {
			Email    string `json:"email" binding:"required"`
			Password string `json:"password" binding:"required"`
		} `json:"user"`
	}
	if err := ctx.ShouldBind(&loginBody); err != nil {
		ctx.JSON(422, gin.H{
			"message": "参数校验失败",
			"detail":  err.Error(),
		})
		return
	}

	// 2. validate Email
	user, _ := models.FindUserByEmail(loginBody.User.Email)
	if user.ID == 0 {
		ctx.JSON(400, gin.H{
			"message": "Email不存在",
		})
		return
	}

	if user.Password != loginBody.User.Password {
		ctx.JSON(400, gin.H{
			"message": "密码错误",
		})
		return
	}

	// 3. generate token
	token, err := utils.GenToken(user.ID)
	if err != nil {
		panic("生成token失败" + err.Error())
	}

	// 4. response
	ctx.JSON(200, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"bio":      user.Bio,
			"image":    user.Image,
			"token":    token,
		},
	})
}

func GetCurrentUser(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)

	ctx.JSON(200, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"bio":      user.Bio,
			"image":    user.Image,
		},
	})
}

func UpdateUserInfo(ctx *gin.Context) {
	u, exist := ctx.Get("user")
	if !exist {
		panic("no auth")
	}
	user := u.(models.User)

	var updateUserBody struct {
		User struct {
			Username string `json:"username"`
			Bio      string `json:"bio"`
			Image    string `json:"image"`
		} `json:"user"`
	}
	ctx.ShouldBind(&updateUserBody)

	var updater models.User
	if updateUserBody.User.Username != "" {
		updater.Username = updateUserBody.User.Username
	}
	if updateUserBody.User.Bio != "" {
		updater.Bio = updateUserBody.User.Bio
	}
	if updateUserBody.User.Image != "" {
		updater.Image = updateUserBody.User.Image
	}
	models.UpdateUserByModel(&user, updater)

	ctx.JSON(200, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"bio":      user.Bio,
			"image":    user.Image,
		},
	})
}
