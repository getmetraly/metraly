// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTRoundTrip(t *testing.T) {
	km, err := NewKeyManager("", true)
	require.NoError(t, err)

	claims := Claims{
		Sub:   "user-123",
		Email: "test@example.com",
		Role:  "admin",
	}

	token, err := km.Sign(claims, time.Hour)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	parsed, err := km.Validate(token)
	require.NoError(t, err)
	assert.Equal(t, claims.Sub, parsed.Sub)
	assert.Equal(t, claims.Email, parsed.Email)
	assert.Equal(t, claims.Role, parsed.Role)
}

func TestJWT_InvalidToken(t *testing.T) {
	km, err := NewKeyManager("", true)
	require.NoError(t, err)

	_, err = km.Validate("invalid-token")
	assert.Error(t, err)
}

func TestJWT_ExpiredToken(t *testing.T) {
	km, err := NewKeyManager("", true)
	require.NoError(t, err)

	claims := Claims{
		Sub:   "user-123",
		Email: "test@example.com",
		Role:  "admin",
	}

	token, err := km.Sign(claims, -time.Hour)
	require.NoError(t, err)

	_, err = km.Validate(token)
	assert.Error(t, err)
}
