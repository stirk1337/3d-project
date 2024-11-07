package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
)

type signInInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func UserProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user_id": userID})
}

func SignIn(c *gin.Context) {
	var input signInInput
	db := c.MustGet("db").(*sqlx.DB)

	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid input"})
		return
	}

	usr, err := GetUserHashByUsername(db, input.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid username or password"})
		return
	}

	isValid, err := VerifyDjangoPassword(input.Password, usr.Password)
	if err != nil || !isValid {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid username or password"})
		return
	}

	token, err := GenerateToken(usr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
	})
}
