package models

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name      string
	ArticleID uint
}

func GetOrCreateTag(name string) (Tag, error) {
	var tag Tag
	r := DB.First(&tag, "name=?", name)
	if r != nil {
		tag.Name = name
		r := DB.Create(&tag)
		if r != nil{
			return tag, r.Error
		}
	}
	return tag, nil
}

func FindTags()(*[]Tag, error){
	var tags [] Tag
	r := DB.Model(&Tag{}).Find(&tags)
	return &tags, r.Error
}