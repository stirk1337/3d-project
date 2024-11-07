package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/pbkdf2"
	"os"
	"strconv"
	"strings"
	"time"
)

func GenerateToken(usr User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		ID:        strconv.FormatInt(usr.ID, 10),
	})
	return token.SignedString([]byte(os.Getenv("JWT_TOKEN")))
}

func VerifyDjangoPassword(password, djangoHash string) (bool, error) {
	parts := strings.Split(djangoHash, "$")
	if len(parts) != 4 {
		return false, errors.New("invalid hash format")
	}

	algorithm, iterStr, salt, expectedHash := parts[0], parts[1], parts[2], parts[3]
	if algorithm != "pbkdf2_sha256" {
		return false, fmt.Errorf("unsupported algorithm: %s", algorithm)
	}

	iterations, err := strconv.Atoi(iterStr)
	if err != nil {
		return false, fmt.Errorf("invalid iteration count: %s", iterStr)
	}

	saltBytes := []byte(salt)
	expectedHashBytes, err := base64.StdEncoding.DecodeString(expectedHash)
	if err != nil {
		return false, fmt.Errorf("invalid hash encoding: %v", err)
	}

	derivedKey := pbkdf2.Key([]byte(password), saltBytes, iterations, len(expectedHashBytes), sha256.New)

	return hmac.Equal(derivedKey, expectedHashBytes), nil
}
