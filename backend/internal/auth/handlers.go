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

type signInResponse struct {
	Token string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzEzMjE0ODcsImp0aSI6IjEifQ.9MZ0XILeQU-zyIdWP_rcUZ20lneAg0Zo_Q_oKfhLUrA"`
}

// UserProfile godoc
// @Summary Получить id текущего юзера
// @Tags auth
// @Accept */*
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Security BearerAuth
// @Router /protected/user [get]
func UserProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user_id": userID})
}

// SignIn godoc
// @Summary Авторизация
// @Tags auth
// @Accept json
// @Produce json
// @Param input body signInInput true "User credentials"
// @Success 200 {object} signInResponse "JWT token"
// @Failure 500 {object} map[string]interface{} "Invalid input or authentication error"
// @Router /sign-in [post]
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

	c.JSON(http.StatusOK, signInResponse{
		Token: token,
	})
}
