package models

import (
	"context"
	"strconv"
	"time"
	"gorm.io/gorm"
)

type Article struct {
	gorm.Model
	Title       string
	Description string
	Body        string

	UserID     uint
	Favoriters []User `gorm:"many2many:user_favorite"`
	TagList    []Tag  `gorm:"many2many:article_tag"`
	Comments   []Comment
}

func(article * Article) GetComments() (*[]Comment, error) {
	var comments []Comment
	r := DB.Model(&article).Preload("Comments").Find(&comments)
	return &comments, r.Error
}


func FindArticleById(articleId string) (*Article, error) {
	var article Article
	r := DB.First(&article, articleId)
	return &article, r.Error
}

func FindArticles(tag, author, favorited, offset, limit  string) (*[]Article, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var articles []Article
	var count int64
	_offset,_ := strconv.Atoi(offset)
	_limit,_ := strconv.Atoi(limit)
	
	tx := DB.WithContext(ctx).Model(&Article{}).Limit(_limit).Offset(_offset)
	
	if tag != "" {
		tx.Joins("left join article_tag t on articles.id=t.article_id").
		Joins("left join tags on tags.id=t.tag_id").
		Where("tags.name=?",tag)
	}

	if author != "" {
		tx.Joins("left join users u on articles.user_id=u.id").
		Where("u.username=?",author)
	}

	if favorited != "" {
		tx.Joins("left join user_favorite f on f.article_id=articles.id").
		Joins("left join users on f.user_id=u.id").
		Where("users.username=?",favorited)
	}

	r := tx.Find(&articles)
	tx.Count(&count)
	return &articles, count, r.Error
}

func CreateArticle(userId uint, title, description, body string, tagList []string)(*Article, error) {

	article := Article {
		Title: title,
		Description: description,
		Body: body,
		UserID: userId,
	}
	if len(tagList) > 0 {
		var tagModelList []Tag
		for _, v := range tagList {
			tag,_ := GetOrCreateTag(v)
			tagModelList = append(tagModelList, tag)
		}
		article.TagList = tagModelList
	}
	r := DB.Create(&article)
	return &article, r.Error
}

func UpdateArticle(article, updater *Article) error {
	return DB.Model(&article).Updates(updater).Error
}

func DeleteArticleById(articleId string) error {
	var article Article
	r := DB.First(&article, articleId)
	if r.Error != nil {
		return r.Error
	}
	return DB.Delete(&article).Error
}