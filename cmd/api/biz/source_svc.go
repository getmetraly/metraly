// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
)

var ErrSourceNotFound = errors.New("source connection not found")
var ErrCredentialNotFound = errors.New("credential not found")

type SourceRepo interface {
	CreateSource(ctx context.Context, sc *domain.SourceConnection) error
	GetSource(ctx context.Context, id string) (*domain.SourceConnection, error)
	ListSources(ctx context.Context, workspaceID string) ([]*domain.SourceConnection, error)
	UpdateSourceStatus(ctx context.Context, id string, status domain.SourceStatus, testedAt, syncedAt *time.Time) error
	AttachCredential(ctx context.Context, sourceID, credentialID string) error
	CreateCredential(ctx context.Context, cr *domain.CredentialRef, encryptedSecret string) error
	GetCredential(ctx context.Context, id string) (*domain.CredentialRef, error)
	GetEncryptedSecret(ctx context.Context, credentialID string) (string, error)
}

type SourceSvc struct {
	repo      SourceRepo
	secretKey []byte
}

func NewSourceSvc(repo SourceRepo, secretKey []byte) (*SourceSvc, error) {
	if len(secretKey) != 32 {
		return nil, fmt.Errorf("source svc: secret key must be 32 bytes, got %d", len(secretKey))
	}
	return &SourceSvc{repo: repo, secretKey: secretKey}, nil
}
func (s *SourceSvc) CreateSource(ctx context.Context, workspaceID string, input domain.CreateSourceInput) (*domain.SourceConnection, *domain.CredentialRef, error) {
	now := time.Now().UTC()
	encrypted, err := s.encryptSecret(input.RawSecret)
	if err != nil {
		return nil, nil, fmt.Errorf("encrypt secret: %w", err)
	}
	cred := &domain.CredentialRef{ID: newID(), WorkspaceID: workspaceID, SourceType: input.SourceType, Kind: credentialKindFor(input.SourceType), Hint: secretHint(input.RawSecret), Scopes: nil, CreatedAt: now, UpdatedAt: now}
	if err := s.repo.CreateCredential(ctx, cred, encrypted); err != nil {
		return nil, nil, fmt.Errorf("store credential: %w", err)
	}
	sc := &domain.SourceConnection{ID: newID(), WorkspaceID: workspaceID, SourceType: input.SourceType, DisplayName: input.DisplayName, Status: domain.SourceStatusPending, Config: input.Config, CredentialID: cred.ID, CreatedAt: now, UpdatedAt: now}
	if err := s.repo.CreateSource(ctx, sc); err != nil {
		return nil, nil, fmt.Errorf("store source: %w", err)
	}
	input.RawSecret = ""
	return sc, cred, nil
}
func (s *SourceSvc) GetSource(ctx context.Context, id string) (*domain.SourceConnection, error) {
	return s.repo.GetSource(ctx, id)
}
func (s *SourceSvc) ListSources(ctx context.Context, workspaceID string) ([]*domain.SourceConnection, error) {
	return s.repo.ListSources(ctx, workspaceID)
}
func (s *SourceSvc) TestConnection(ctx context.Context, sourceID string) (*domain.ConnectionTestResult, error) {
	sc, err := s.repo.GetSource(ctx, sourceID)
	if err != nil {
		return &domain.ConnectionTestResult{Status: domain.TestResultUnknown, Message: "source not found", TestedAt: time.Now().UTC()}, ErrSourceNotFound
	}
	start := time.Now()
	if sc.CredentialID != "" {
		enc, err := s.repo.GetEncryptedSecret(ctx, sc.CredentialID)
		if err != nil || enc == "" {
			return &domain.ConnectionTestResult{Status: domain.TestResultInvalidCreds, Message: "credential not retrievable", TestedAt: time.Now().UTC(), LatencyMs: time.Since(start).Milliseconds()}, nil
		}
		if _, err := s.decryptSecret(enc); err != nil {
			return &domain.ConnectionTestResult{Status: domain.TestResultInvalidCreds, Message: "credential decryption failed", TestedAt: time.Now().UTC(), LatencyMs: time.Since(start).Milliseconds()}, nil
		}
	}
	now := time.Now().UTC()
	_ = s.repo.UpdateSourceStatus(ctx, sourceID, domain.SourceStatusTesting, &now, nil)
	_ = s.repo.UpdateSourceStatus(ctx, sourceID, domain.SourceStatusReady, &now, nil)
	return &domain.ConnectionTestResult{Status: domain.TestResultOK, Message: "credential structure valid; live adapter test pending Phase 2", TestedAt: now, LatencyMs: time.Since(start).Milliseconds()}, nil
}
func (s *SourceSvc) encryptSecret(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.secretKey)
	if err != nil {
		return "", err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}
func (s *SourceSvc) decryptSecret(encoded string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(s.secretKey)
	if err != nil {
		return "", err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(ciphertext) < aead.NonceSize() {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:aead.NonceSize()], ciphertext[aead.NonceSize():]
	plaintext, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}
func secretHint(secret string) string {
	if len(secret) <= 4 {
		return "****"
	}
	return secret[len(secret)-4:]
}
func credentialKindFor(st domain.SourceType) domain.CredentialKind {
	switch st {
	case domain.SourceTypeGitHub, domain.SourceTypeGitHubActions, domain.SourceTypeGitLab:
		return domain.CredentialKindPAT
	case domain.SourceTypeJira, domain.SourceTypeLinear:
		return domain.CredentialKindAPIToken
	default:
		return domain.CredentialKindAPIToken
	}
}
func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b[0:4]) + "-" + hex.EncodeToString(b[4:6]) + "-" + hex.EncodeToString(b[6:8]) + "-" + hex.EncodeToString(b[8:10]) + "-" + hex.EncodeToString(b[10:16])
}
func DeriveKey(passphrase string) []byte { h := sha256.Sum256([]byte(passphrase)); return h[:] }
