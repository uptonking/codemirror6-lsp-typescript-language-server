package utils

import (
	"fmt"
	"time"
	"github.com/golang-jwt/jwt/v5"
)

const TokenExpireDuration = time.Minute * 10

var MySecret = []byte("这是一段用于生成token的密钥")

func GenToken(id uint) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id": id,
		"exp": jwt.NewNumericDate(time.Now().Add(TokenExpireDuration)),
	})
	
	tokenString, err := token.SignedString(MySecret)
	return tokenString, err
}

func ParseToken(tokenString string) (uint, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return MySecret, nil
	})

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return uint(claims["id"].(float64)), nil
	} else {
		return 0, err
	}
}
