package models

import (
	"fmt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	db, err := gorm.Open(sqlite.Open("realworld.sqlite"), &gorm.Config{})
	// db, err := gorm.Open(sqlite.Open(viper.GetString("mysqlDNS")), &gorm.Config{})
	if err != nil {
		panic("failed to connect database realworld.sqlite")
	}
	fmt.Println("connected to database realworld.sqlite successfully")
	DB = db

	db.AutoMigrate(
		&User{},
		&Article{},
		&Comment{},
		&Tag{},
	)
}
