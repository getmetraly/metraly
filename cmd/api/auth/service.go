// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type TokenPair struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int          `json:"expires_in"`
	User         *domain.User `json:"user"`
}

type Service struct {
	km               *KeyManager
	store            TokenStore
	users            repo.UserRepo
	accessTTL        time.Duration
	oidc             OIDCProvider
	defaultWorkspace string
}

// NewService creates an auth Service.
// defaultWorkspace is embedded in every issued access token.
// For the MVP all users belong to one workspace; future phases will look it up from the user record.
func NewService(km *KeyManager, store TokenStore, users repo.UserRepo, accessTTL time.Duration, oidc OIDCProvider, defaultWorkspace string) *Service {
	return &Service{km: km, store: store, users: users, accessTTL: accessTTL, oidc: oidc, defaultWorkspace: defaultWorkspace}
}

func (s *Service) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	userID, hash, err := s.users.GetPasswordHash(ctx, email)
	if err != nil {
		return nil, biz.ErrUnauthorized
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return nil, biz.ErrUnauthorized
	}
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	return s.issuePair(ctx, user)
}

func (s *Service) LoginOIDC(ctx context.Context, email string) (*TokenPair, error) {
	u, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		u = &domain.User{ID: newID(), Email: email, Role: "viewer"}
		if err := s.users.Create(ctx, u, ""); err != nil {
			return nil, err
		}
	}
	return s.issuePair(ctx, u)
}

func (s *Service) Refresh(ctx context.Context, rawToken string) (string, int, error) {
	userID, err := s.store.Consume(ctx, rawToken)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return "", 0, biz.ErrUnauthorized
		}
		return "", 0, fmt.Errorf("consume token: %w", err)
	}
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return "", 0, biz.ErrUnauthorized
	}
	access, err := s.km.Sign(Claims{Sub: user.ID, Email: user.Email, Role: user.Role, Workspace: s.defaultWorkspace}, s.accessTTL)
	if err != nil {
		return "", 0, fmt.Errorf("sign: %w", err)
	}
	return access, int(s.accessTTL.Seconds()), nil
}

func (s *Service) Logout(ctx context.Context, rawToken string) error {
	_, err := s.store.Consume(ctx, rawToken)
	if errors.Is(err, redis.Nil) {
		return nil
	}
	return err
}

func (s *Service) issuePair(ctx context.Context, user *domain.User) (*TokenPair, error) {
	access, err := s.km.Sign(Claims{Sub: user.ID, Email: user.Email, Role: user.Role, Workspace: s.defaultWorkspace}, s.accessTTL)
	if err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}
	refresh, err := s.store.Issue(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("issue refresh: %w", err)
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int(s.accessTTL.Seconds()),
		User:         user,
	}, nil
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
