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
	"github.com/getmetraly/metraly/cmd/api/repo"
)

// ErrSourceNotFound is returned when a source connection does not exist.
var ErrSourceNotFound = fmt.Errorf("source connection not found: %w", repo.ErrNotFound)

// ErrCredentialNotFound is returned when a credential reference does not exist.
var ErrCredentialNotFound = fmt.Errorf("credential not found: %w", repo.ErrNotFound)

// SourceRepo is the persistence interface for source connections.
// All reads that could expose cross-tenant data require an explicit workspaceID.
type SourceRepo interface {
	CreateSource(ctx context.Context, sc *domain.SourceConnection) error
	CreateSourceWithCredential(ctx context.Context, sc *domain.SourceConnection, cr *domain.CredentialRef, encryptedSecret string) error
	// GetSource retrieves a source by ID within the given workspace.
	// Returns repo.ErrNotFound when id or workspaceID does not match.
	GetSource(ctx context.Context, workspaceID, id string) (*domain.SourceConnection, error)
	ListSources(ctx context.Context, workspaceID string) ([]*domain.SourceConnection, error)
	UpdateSourceStatus(ctx context.Context, id string, status domain.SourceStatus, testedAt, syncedAt *time.Time) error
	AttachCredential(ctx context.Context, sourceID, credentialID string) error
	CreateCredential(ctx context.Context, cr *domain.CredentialRef, encryptedSecret string) error
	GetCredential(ctx context.Context, id string) (*domain.CredentialRef, error)
	// GetEncryptedSecret retrieves the encrypted secret for a credential within the given workspace.
	// Returns repo.ErrNotFound when credentialID or workspaceID does not match.
	GetEncryptedSecret(ctx context.Context, workspaceID, credentialID string) (string, error)
}

// SourceSvc implements business logic for source registry and credential management.
type SourceSvc struct {
	repo      SourceRepo
	secretKey []byte
	adapters  *AdapterRegistry
}

// NewSourceSvc creates a SourceSvc. secretKey must be exactly 32 bytes.
func NewSourceSvc(r SourceRepo, secretKey []byte, adapters *AdapterRegistry) (*SourceSvc, error) {
	if len(secretKey) != 32 {
		return nil, fmt.Errorf("source svc: secret key must be 32 bytes, got %d", len(secretKey))
	}
	if adapters == nil {
		adapters = NewAdapterRegistry()
	}
	return &SourceSvc{repo: r, secretKey: secretKey, adapters: adapters}, nil
}

// CreateSource creates a new source connection and stores its encrypted credential atomically.
// The raw secret from input is encrypted; input.RawSecret is zeroed immediately after use.
func (s *SourceSvc) CreateSource(ctx context.Context, workspaceID string, input domain.CreateSourceInput) (*domain.SourceConnection, *domain.CredentialRef, error) {
	now := time.Now().UTC()

	encrypted, err := s.encryptSecret(input.RawSecret)
	if err != nil {
		return nil, nil, fmt.Errorf("encrypt secret: %w", err)
	}
	hint := secretHint(input.RawSecret)
	input.RawSecret = "" // zero immediately; must never appear in logs or errors below

	cred := &domain.CredentialRef{
		ID:          newID(),
		WorkspaceID: workspaceID,
		SourceType:  input.SourceType,
		Kind:        credentialKindFor(input.SourceType),
		Hint:        hint,
		Scopes:      []string{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	sc := &domain.SourceConnection{
		ID:           newID(),
		WorkspaceID:  workspaceID,
		SourceType:   input.SourceType,
		DisplayName:  input.DisplayName,
		Status:       domain.SourceStatusPending,
		Config:       input.Config,
		CredentialID: cred.ID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// Atomic: if source insert fails the credential insert is rolled back too.
	if err := s.repo.CreateSourceWithCredential(ctx, sc, cred, encrypted); err != nil {
		return nil, nil, fmt.Errorf("create source: %w", err)
	}

	return sc, cred, nil
}

// GetSource retrieves a source connection scoped to workspaceID without any secret material.
func (s *SourceSvc) GetSource(ctx context.Context, workspaceID, id string) (*domain.SourceConnection, error) {
	sc, err := s.repo.GetSource(ctx, workspaceID, id)
	if errors.Is(err, repo.ErrNotFound) {
		return nil, ErrSourceNotFound
	}
	return sc, err
}

// ListSources retrieves all source connections for a workspace without secret material.
func (s *SourceSvc) ListSources(ctx context.Context, workspaceID string) ([]*domain.SourceConnection, error) {
	return s.repo.ListSources(ctx, workspaceID)
}

// TestConnection performs a connection test via the registered source adapter.
// Both source and credential lookup are workspace-scoped.
func (s *SourceSvc) TestConnection(ctx context.Context, workspaceID, sourceID string) (*domain.ConnectionTestResult, error) {
	sc, err := s.repo.GetSource(ctx, workspaceID, sourceID)
	if errors.Is(err, repo.ErrNotFound) {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultUnknown,
			Message:  "source not found",
			TestedAt: time.Now().UTC(),
		}, ErrSourceNotFound
	}
	if err != nil {
		return &domain.ConnectionTestResult{
			Status:   domain.TestResultUnknown,
			Message:  "failed to load source",
			TestedAt: time.Now().UTC(),
		}, err
	}

	start := time.Now()

	adapter, ok := s.adapters.Get(sc.SourceType)
	if !ok {
		return &domain.ConnectionTestResult{
			Status:    domain.TestResultUnsupportedSource,
			Message:   "no adapter registered for source type " + string(sc.SourceType),
			TestedAt:  time.Now().UTC(),
			LatencyMs: time.Since(start).Milliseconds(),
		}, nil
	}

	// Decrypt secret for adapter — both source and credential are scoped to workspaceID.
	var secret string
	if sc.CredentialID != "" {
		enc, err := s.repo.GetEncryptedSecret(ctx, sc.WorkspaceID, sc.CredentialID)
		if errors.Is(err, repo.ErrNotFound) || enc == "" {
			return &domain.ConnectionTestResult{
				Status:    domain.TestResultInvalidCreds,
				Message:   "credential not retrievable",
				TestedAt:  time.Now().UTC(),
				LatencyMs: time.Since(start).Milliseconds(),
			}, nil
		}
		if err != nil {
			return &domain.ConnectionTestResult{
				Status:    domain.TestResultUnknown,
				Message:   "credential lookup failed",
				TestedAt:  time.Now().UTC(),
				LatencyMs: time.Since(start).Milliseconds(),
			}, err
		}
		secret, err = s.decryptSecret(enc)
		if err != nil {
			return &domain.ConnectionTestResult{
				Status:    domain.TestResultInvalidCreds,
				Message:   "credential decryption failed",
				TestedAt:  time.Now().UTC(),
				LatencyMs: time.Since(start).Milliseconds(),
			}, nil
		}
	}

	result, adapterErr := adapter.TestConnection(ctx, *sc, secret)
	secret = "" // zero secret after adapter call

	if result == nil {
		result = &domain.ConnectionTestResult{
			Status:    domain.TestResultUnknown,
			Message:   "adapter returned nil result",
			TestedAt:  time.Now().UTC(),
			LatencyMs: time.Since(start).Milliseconds(),
		}
	}

	// Persist source status based on test outcome.
	now := time.Now().UTC()
	if result.Status == domain.TestResultOK {
		if updErr := s.repo.UpdateSourceStatus(ctx, sourceID, domain.SourceStatusReady, &now, nil); updErr != nil {
			result.Message += " (warning: status persist failed)"
		}
	} else {
		_ = s.repo.UpdateSourceStatus(ctx, sourceID, domain.SourceStatusAuthFailed, &now, nil)
	}

	return result, adapterErr
}

// DecryptSecretForSource decrypts the credential for the given source.
// The source must have already been loaded from the correct workspace.
// Exposed for use by CollectorSvc, which owns the workspace-scoped source.
func (s *SourceSvc) DecryptSecretForSource(ctx context.Context, sc *domain.SourceConnection) (string, error) {
	if sc.CredentialID == "" {
		return "", nil
	}
	enc, err := s.repo.GetEncryptedSecret(ctx, sc.WorkspaceID, sc.CredentialID)
	if err != nil {
		return "", fmt.Errorf("get encrypted secret: %w", err)
	}
	return s.decryptSecret(enc)
}

// — Credential encryption helpers —

// encryptSecret encrypts plaintext using AES-256-GCM and returns base64-encoded ciphertext.
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

// decryptSecret decrypts a base64-encoded AES-256-GCM ciphertext.
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
	nonce, ct := ciphertext[:aead.NonceSize()], ciphertext[aead.NonceSize():]
	plaintext, err := aead.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// secretHint returns the last 4 characters of a secret, safe for display.
func secretHint(secret string) string {
	if len(secret) <= 4 {
		return "****"
	}
	return secret[len(secret)-4:]
}

// credentialKindFor maps source types to credential kinds.
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
	return hex.EncodeToString(b[0:4]) + "-" + hex.EncodeToString(b[4:6]) + "-" +
		hex.EncodeToString(b[6:8]) + "-" + hex.EncodeToString(b[8:10]) + "-" + hex.EncodeToString(b[10:16])
}

// DeriveKey derives a 32-byte AES key from a passphrase using SHA-256.
//
// WARNING: This is a weak KDF suitable ONLY for development/test environments.
// In production, SOURCE_SECRET_KEY must be a securely generated 32-byte value
// provided via environment variable; never derived from a static passphrase.
func DeriveKey(passphrase string) []byte {
	h := sha256.Sum256([]byte(passphrase))
	return h[:]
}
