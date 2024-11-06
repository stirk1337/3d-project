package internal

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"golang.org/x/crypto/pbkdf2"
	"strconv"
	"strings"
)

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
