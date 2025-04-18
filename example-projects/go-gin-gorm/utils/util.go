package utils

import (
	"bytes"
	"encoding/json"
)

func Struct2JSON(s interface{}) string {
	bs, _ := json.Marshal(s)
	var out bytes.Buffer
	json.Indent(&out, bs, "", "  ")
	return out.String()
}