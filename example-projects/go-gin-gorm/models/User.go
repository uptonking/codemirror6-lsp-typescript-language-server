package models

import (
	"strconv"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username string `gorm:"not null"`
	Bio      string
	Image    string
	Email    string
	Password string

	Articles         []Article
	FavoriteArticles []*User `gorm:"many2many:user_favorite"`
	Followers        []*User `gorm:"many2many:following;foreignKey:ID;joinForeignKey:UserID;References:ID;joinReferences:FollowerID"`
	Followings       []*User `gorm:"many2many:following;joinForeignKey:FollowerID;foreignKey:ID;References:ID;joinReferences:UserID"`
}

// User Methods
func (u *User) Follow(targetUser *User) error {
	return DB.Model(targetUser).Association("Followers").Append(u)
}

func (user *User) UnFollow(targetUser *User) error {
	return DB.Model(targetUser).Association("Followers").Delete(user)
}

func (user *User) GetFollowers() (*[]User, error) {
	var followers []User
	result := DB.Model(user).Association("Followers").Find(&followers)
	return &followers, result
}

func (user *User) GetFollowings() (*[]User, error) {
	var followers []User
	result := DB.Model(user).Association("Followings").Find(&followers)
	return &followers, result
}

func (user *User) GetFeedArticles(offset, limit string) (*[]Article, int64, error) {
	_offset, _ := strconv.Atoi(offset)
	_limit, _ := strconv.Atoi(limit)
	var articles []Article
	var count int64
	r := DB.Model(&Article{}).
		Joins("left join following on following.user_id=articles.user_id").
		Where("following.follower_id=?", user.ID).
		Limit(_limit).
		Offset(_offset).
		Find(&articles)
	
	
	DB.Model(&Article{}).
	Joins("left join following on following.user_id=articles.user_id").
	Where("following.follower_id=?", user.ID).
	Limit(_limit).
	Offset(_offset).
	Count(&count)

	return &articles, count, r.Error

}

func (user *User) HasArticle (articleId string) bool {
	var article Article
	DB.First(&article, articleId)
	return article.UserID == user.ID
}

func (user *User) HasComment (commentId string) bool {
	var comment Comment
	DB.First(&comment, commentId)
	return comment.UserID == user.ID
}

func (user *User) Favorite(article *Article) error {
	return DB.Model(&user).Association("FavoriteArticles").Append(&article)
}

func (user *User) UnFavorite(article *Article) error {
	return DB.Model(&user).Association("FavoriteArticles").Delete(&article)
}

// User functions
func FindUserByID(id uint) (*User, error) {
	var target User
	result := DB.First(&target, id)
	return &target, result.Error
}

func FindUserByEmail(email string) (*User, error) {
	var target User
	result := DB.First(&target, "email = ?", email)
	return &target, result.Error
}

func CreateUser(username, passowrd, bio, image, email string) (*User, error) {
	user := User{
		Username: username,
		Password: passowrd,
		Bio:      bio,
		Image:    image,
		Email:    email,
	}
	result := DB.Create(&user)
	return &user, result.Error
}

func UpdateUserByModel(user *User, updater User) error {
	return DB.Model(&user).Updates(updater).Error
}

func DeleteUser(user *User) error {
	return DB.Delete(&user).Error
}
