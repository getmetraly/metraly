// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"
)

type Claims struct {
	Sub       string
	Email     string
	Role      string
	Workspace string // workspace ID the token is scoped to
}

type jwtClaims struct {
	jwt.RegisteredClaims
	Email     string `json:"email"`
	Role      string `json:"role"`
	Workspace string `json:"workspace"`
}

type KeyManager struct {
	private *rsa.PrivateKey
}

// NewKeyManager parses pemKey into a KeyManager.
// If pemKey is empty and allowEphemeral is true, a temporary RSA key is generated
// (only for development/test; tokens are invalidated on restart).
// If pemKey is empty and allowEphemeral is false, an error is returned (production safe-fail).
func NewKeyManager(pemKey string, allowEphemeral bool) (*KeyManager, error) {
	if pemKey == "" {
		if !allowEphemeral {
			return nil, fmt.Errorf("JWT_PRIVATE_KEY must be set in production (APP_ENV=production)")
		}
		log.Warn().Msg("JWT_PRIVATE_KEY not set — generating ephemeral RSA-2048 key; tokens invalidated on restart (set APP_ENV=production to fail-fast)")
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			return nil, fmt.Errorf("generate rsa key: %w", err)
		}
		return &KeyManager{private: key}, nil
	}

	block, _ := pem.Decode([]byte(pemKey))
	if block == nil {
		return nil, fmt.Errorf("invalid PEM block")
	}
	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	return &KeyManager{private: key}, nil
}

func (km *KeyManager) Sign(c Claims, ttl time.Duration) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwtClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   c.Sub,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
		Email:     c.Email,
		Role:      c.Role,
		Workspace: c.Workspace,
	})
	return token.SignedString(km.private)
}

func (km *KeyManager) Validate(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return &km.private.PublicKey, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return &Claims{
		Sub:       claims.Subject,
		Email:     claims.Email,
		Role:      claims.Role,
		Workspace: claims.Workspace,
	}, nil
}
