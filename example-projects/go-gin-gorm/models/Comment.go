package models

import "gorm.io/gorm"

type Comment struct {
	gorm.Model
	UserID    uint
	User      User
	Body      string
	ArticleID uint
	Article   Article
}

func CreateComment(userId, articleId uint, body string) (*Comment, error) {
	comment := Comment{
		UserID:    userId,
		ArticleID: articleId,
		Body:      body,
	}
	r := DB.Create(&comment)
	return &comment, r.Error
}

func DeleteCommentById(commentId string) error {
	var comment Comment
	r := DB.First(&comment, commentId)
	if r.Error != nil {
		return r.Error
	}
	return DB.Delete(&comment).Error
}