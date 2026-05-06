// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

type mockUserRepo struct {
	mock.Mock
}

func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	args := m.Called(ctx, id)
	if u, ok := args.Get(0).(*domain.User); ok {
		return u, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if u, ok := args.Get(0).(*domain.User); ok {
		return u, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockUserRepo) FindByOIDCSub(ctx context.Context, sub string) (*domain.User, error) {
	args := m.Called(ctx, sub)
	if u, ok := args.Get(0).(*domain.User); ok {
		return u, args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockUserRepo) Create(ctx context.Context, u *domain.User, passwordHash string) error {
	args := m.Called(ctx, u, passwordHash)
	return args.Error(0)
}

func (m *mockUserRepo) Upsert(ctx context.Context, u *domain.User, passwordHash string) error {
	args := m.Called(ctx, u, passwordHash)
	return args.Error(0)
}

func (m *mockUserRepo) GetPasswordHash(ctx context.Context, email string) (string, string, error) {
	args := m.Called(ctx, email)
	return args.String(0), args.String(1), args.Error(2)
}

type mockTokenStore struct {
	mock.Mock
}

func (m *mockTokenStore) Issue(ctx context.Context, userID string) (string, error) {
	args := m.Called(ctx, userID)
	return args.String(0), args.Error(1)
}

func (m *mockTokenStore) Consume(ctx context.Context, raw string) (string, error) {
	args := m.Called(ctx, raw)
	return args.String(0), args.Error(1)
}

type mockOIDCProvider struct {
	mock.Mock
}

func (m *mockOIDCProvider) VerifyIDToken(ctx context.Context, rawIDToken string) (string, error) {
	args := m.Called(ctx, rawIDToken)
	return args.String(0), args.Error(1)
}

func TestLogin_Success(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	hashedPassword, _ := hashPassword("password123")

	userRepo.On("GetPasswordHash", ctx, "test@example.com").Return("user-123", hashedPassword, nil)
	userRepo.On("FindByID", ctx, "user-123").Return(&domain.User{
		ID: "user-123", Email: "test@example.com", Role: "admin",
	}, nil)
	tokenStore.On("Issue", ctx, "user-123").Return("refresh-token-123", nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	pair, err := svc.Login(ctx, "test@example.com", "password123")

	assert.NoError(t, err)
	assert.NotNil(t, pair)
	assert.NotEmpty(t, pair.AccessToken)
	assert.Equal(t, "refresh-token-123", pair.RefreshToken)
	assert.Equal(t, "user-123", pair.User.ID)
	userRepo.AssertExpectations(t)
	tokenStore.AssertExpectations(t)
}

func TestLogin_WrongPassword(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	hashedPassword, _ := hashPassword("correct-password")

	userRepo.On("GetPasswordHash", ctx, "test@example.com").Return("user-123", hashedPassword, nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	_, err := svc.Login(ctx, "test@example.com", "wrong-password")

	assert.ErrorIs(t, err, biz.ErrUnauthorized)
	userRepo.AssertExpectations(t)
}

func TestLogin_UserNotFound(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	userRepo.On("GetPasswordHash", ctx, "nonexistent@example.com").Return("", "", errors.New("not found"))

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	_, err := svc.Login(ctx, "nonexistent@example.com", "password")

	assert.ErrorIs(t, err, biz.ErrUnauthorized)
	userRepo.AssertExpectations(t)
}

func TestRefresh_Success(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	userRepo.On("FindByID", ctx, "user-123").Return(&domain.User{
		ID: "user-123", Email: "test@example.com", Role: "admin",
	}, nil)
	tokenStore.On("Consume", ctx, "valid-refresh-token").Return("user-123", nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	accessToken, expiresIn, err := svc.Refresh(ctx, "valid-refresh-token")

	assert.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.Equal(t, 3600, expiresIn)
	tokenStore.AssertExpectations(t)
	userRepo.AssertExpectations(t)
}

func TestRefresh_InvalidToken(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	tokenStore.On("Consume", ctx, "invalid-token").Return("", redis.Nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	_, _, err := svc.Refresh(ctx, "invalid-token")

	assert.ErrorIs(t, err, biz.ErrUnauthorized)
	tokenStore.AssertExpectations(t)
}

func TestLogout(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	tokenStore.On("Consume", ctx, "refresh-token-123").Return("", nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	err := svc.Logout(ctx, "refresh-token-123")

	assert.NoError(t, err)
	tokenStore.AssertExpectations(t)
}

func TestLoginOIDC_Flow_ExistingUser(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	userRepo.On("FindByEmail", ctx, "oidc@example.com").Return(&domain.User{
		ID: "user-456", Email: "oidc@example.com", Role: "viewer",
	}, nil)
	tokenStore.On("Issue", ctx, "user-456").Return("refresh-token-456", nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	pair, err := svc.LoginOIDC(ctx, "oidc@example.com")

	assert.NoError(t, err)
	assert.NotNil(t, pair)
	assert.Equal(t, "user-456", pair.User.ID)
	userRepo.AssertExpectations(t)
	tokenStore.AssertExpectations(t)
}

func TestLoginOIDC_Flow_NewUser(t *testing.T) {
	ctx := context.Background()
	km, _ := NewKeyManager("")
	userRepo := new(mockUserRepo)
	tokenStore := new(mockTokenStore)
	oidc := new(mockOIDCProvider)

	userRepo.On("FindByEmail", ctx, "new@example.com").Return(nil, errors.New("not found"))
	userRepo.On("Create", ctx, mock.AnythingOfType("*domain.User"), "").Return(nil)
	tokenStore.On("Issue", ctx, mock.AnythingOfType("string")).Return("refresh-token-789", nil)

	svc := NewService(km, tokenStore, userRepo, time.Hour, oidc)

	pair, err := svc.LoginOIDC(ctx, "new@example.com")

	assert.NoError(t, err)
	assert.NotNil(t, pair)
	assert.Equal(t, "new@example.com", pair.User.Email)
	assert.Equal(t, "viewer", pair.User.Role)
	userRepo.AssertExpectations(t)
	tokenStore.AssertExpectations(t)
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}
