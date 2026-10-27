package app

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"strings"

	"golang.org/x/crypto/scrypt"
)

func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	saltText := hex.EncodeToString(salt)
	derived, err := scrypt.Key([]byte(password), []byte(saltText), 1<<14, 8, 1, 64)
	if err != nil {
		return "", err
	}
	return saltText + ":" + hex.EncodeToString(derived), nil
}

func verifyPassword(password, stored string) bool {
	parts := strings.Split(stored, ":")
	if len(parts) != 2 {
		return false
	}
	if _, err := hex.DecodeString(parts[0]); err != nil || len(parts[0]) == 0 {
		return false
	}
	salt := []byte(parts[0])
	expected, err := hex.DecodeString(parts[1])
	if err != nil || len(expected) != 64 {
		return false
	}
	actual, err := scrypt.Key([]byte(password), salt, 1<<14, 8, 1, len(expected))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1
}
