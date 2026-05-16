// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

import (
	"context"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/repo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeSourceRepo is an in-memory SourceRepo for biz-layer unit tests.
type fakeSourceRepo struct {
	sources     map[string]*domain.SourceConnection
	credentials map[string]*domain.CredentialRef
	secrets     map[string]string
}

func newFakeSourceRepo() *fakeSourceRepo {
	return &fakeSourceRepo{
		sources:     map[string]*domain.SourceConnection{},
		credentials: map[string]*domain.CredentialRef{},
		secrets:     map[string]string{},
	}
}

func (f *fakeSourceRepo) CreateSource(_ context.Context, sc *domain.SourceConnection) error {
	f.sources[sc.ID] = sc
	return nil
}

func (f *fakeSourceRepo) CreateSourceWithCredential(_ context.Context, sc *domain.SourceConnection, cr *domain.CredentialRef, encryptedSecret string) error {
	f.credentials[cr.ID] = cr
	f.secrets[cr.ID] = encryptedSecret
	f.sources[sc.ID] = sc
	return nil
}

func (f *fakeSourceRepo) GetSource(_ context.Context, id string) (*domain.SourceConnection, error) {
	sc, ok := f.sources[id]
	if !ok {
		return nil, repo.ErrNotFound // repo layer sentinel; biz maps this to ErrSourceNotFound
	}
	return sc, nil
}

func (f *fakeSourceRepo) ListSources(_ context.Context, workspaceID string) ([]*domain.SourceConnection, error) {
	var result []*domain.SourceConnection
	for _, sc := range f.sources {
		if sc.WorkspaceID == workspaceID {
			result = append(result, sc)
		}
	}
	return result, nil
}

func (f *fakeSourceRepo) UpdateSourceStatus(_ context.Context, id string, status domain.SourceStatus, testedAt, syncedAt *time.Time) error {
	if sc, ok := f.sources[id]; ok {
		sc.Status = status
		sc.LastTestedAt = testedAt
		sc.LastSyncedAt = syncedAt
	}
	return nil
}

func (f *fakeSourceRepo) AttachCredential(_ context.Context, sourceID, credentialID string) error {
	if sc, ok := f.sources[sourceID]; ok {
		sc.CredentialID = credentialID
		sc.Status = domain.SourceStatusPending
	}
	return nil
}

func (f *fakeSourceRepo) CreateCredential(_ context.Context, cr *domain.CredentialRef, encryptedSecret string) error {
	f.credentials[cr.ID] = cr
	f.secrets[cr.ID] = encryptedSecret
	return nil
}

func (f *fakeSourceRepo) GetCredential(_ context.Context, id string) (*domain.CredentialRef, error) {
	cr, ok := f.credentials[id]
	if !ok {
		return nil, repo.ErrNotFound
	}
	return cr, nil
}

func (f *fakeSourceRepo) GetEncryptedSecret(_ context.Context, credentialID string) (string, error) {
	enc, ok := f.secrets[credentialID]
	if !ok {
		return "", repo.ErrNotFound
	}
	return enc, nil
}

// newTestSvc creates a SourceSvc with an empty adapter registry for unit tests.
func newTestSvc(t *testing.T) (*biz.SourceSvc, *fakeSourceRepo) {
	t.Helper()
	r := newFakeSourceRepo()
	key := biz.DeriveKey("test-only-do-not-use-in-production")
	svc, err := biz.NewSourceSvc(r, key, biz.NewAdapterRegistry())
	require.NoError(t, err)
	return svc, r
}

func TestSourceSvc_CreateSource_HappyPath(t *testing.T) {
	svc, repo := newTestSvc(t)
	input := domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "acme GitHub",
		Config:      map[string]string{"org": "acme"},
		RawSecret:   "ghp_thisisatesttoken1234",
	}
	sc, cred, err := svc.CreateSource(context.Background(), "ws_01", input)
	require.NoError(t, err)
	require.NotNil(t, sc)
	require.NotNil(t, cred)

	assert.Equal(t, domain.SourceTypeGitHub, sc.SourceType)
	assert.Equal(t, domain.SourceStatusPending, sc.Status)
	assert.NotEmpty(t, sc.ID)
	assert.Equal(t, cred.ID, sc.CredentialID)
	assert.Equal(t, "1234", cred.Hint)
	assert.Equal(t, domain.CredentialKindPAT, cred.Kind)

	encrypted := repo.secrets[cred.ID]
	assert.NotEmpty(t, encrypted)
	assert.NotEqual(t, "ghp_thisisatesttoken1234", encrypted)
}

func TestSourceSvc_CreateSource_Atomic(t *testing.T) {
	// CreateSourceWithCredential is called — both credential and source are stored atomically.
	svc, r := newTestSvc(t)
	input := domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "atomic test",
		Config:      map[string]string{"org": "acme"},
		RawSecret:   "ghp_atomictest1234",
	}
	sc, cred, err := svc.CreateSource(context.Background(), "ws_01", input)
	require.NoError(t, err)

	// Both should be findable in the same fake store
	assert.NotNil(t, r.sources[sc.ID])
	assert.NotNil(t, r.credentials[cred.ID])
	assert.NotEmpty(t, r.secrets[cred.ID])
}

func TestSourceSvc_CreateSource_SecretNotInSource(t *testing.T) {
	svc, _ := newTestSvc(t)
	input := domain.CreateSourceInput{
		SourceType:  domain.SourceTypeJira,
		DisplayName: "acme Jira",
		Config:      map[string]string{"project": "ACME"},
		RawSecret:   "jira-secret-token",
	}
	sc, _, err := svc.CreateSource(context.Background(), "ws_01", input)
	require.NoError(t, err)
	for _, v := range sc.Config {
		assert.NotContains(t, v, "jira-secret-token")
	}
}

func TestSourceSvc_GetSource_NotFound(t *testing.T) {
	svc, _ := newTestSvc(t)
	_, err := svc.GetSource(context.Background(), "nonexistent")
	assert.ErrorIs(t, err, biz.ErrSourceNotFound)
}

// TestSourceSvc_TestConnection_UnsupportedSource verifies that an empty registry
// returns TestResultUnsupportedSource rather than panicking or returning OK.
func TestSourceSvc_TestConnection_UnsupportedSource(t *testing.T) {
	svc, _ := newTestSvc(t) // empty registry — no adapters registered
	sc, _, err := svc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "test",
		Config:      map[string]string{"org": "acme"},
		RawSecret:   "ghp_testtoken1234",
	})
	require.NoError(t, err)

	result, err := svc.TestConnection(context.Background(), sc.ID)
	assert.NoError(t, err)
	assert.Equal(t, domain.TestResultUnsupportedSource, result.Status)
}

// TestSourceSvc_TestConnection_WithGitHubAdapter verifies the happy path
// when the GitHub adapter is registered and receives a valid-format token.
func TestSourceSvc_TestConnection_WithGitHubAdapter(t *testing.T) {
	r := newFakeSourceRepo()
	key := biz.DeriveKey("test-only-do-not-use-in-production")
	reg := biz.NewAdapterRegistry()
	reg.Register(&biz.GitHubAdapter{})
	svc, err := biz.NewSourceSvc(r, key, reg)
	require.NoError(t, err)

	sc, _, err := svc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "acme GitHub",
		Config:      map[string]string{"org": "acme"},
		RawSecret:   "ghp_testtoken1234",
	})
	require.NoError(t, err)

	result, err := svc.TestConnection(context.Background(), sc.ID)
	assert.NoError(t, err)
	assert.Equal(t, domain.TestResultOK, result.Status)
	assert.NotEmpty(t, result.ScopesFound)
}

func TestSourceSvc_TestConnection_NotFound(t *testing.T) {
	svc, _ := newTestSvc(t)
	_, err := svc.TestConnection(context.Background(), "nonexistent")
	assert.ErrorIs(t, err, biz.ErrSourceNotFound)
}

func TestSourceSvc_InvalidKeyLength(t *testing.T) {
	_, err := biz.NewSourceSvc(newFakeSourceRepo(), []byte("tooshort"), biz.NewAdapterRegistry())
	assert.Error(t, err)
}

func TestSourceSvc_Hint_ShortSecret(t *testing.T) {
	svc, repo := newTestSvc(t)
	_, cred, err := svc.CreateSource(context.Background(), "ws_01", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "short secret",
		Config:      map[string]string{"org": "x"},
		RawSecret:   "abc", // less than 4 chars
	})
	require.NoError(t, err)
	assert.Equal(t, "****", cred.Hint)
	assert.NotEmpty(t, repo.secrets[cred.ID])
}
