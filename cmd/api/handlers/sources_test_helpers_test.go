// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"context"
	"net/http"
	"time"

	"github.com/getmetraly/metraly/cmd/api/auth"
	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/getmetraly/metraly/cmd/api/middleware"
	"github.com/getmetraly/metraly/cmd/api/repo"
)

// fakeSourceRepoForHandler is an in-memory SourceRepo for handler tests.
type fakeSourceRepoForHandler struct {
	sources map[string]any
	creds   map[string]any
	secrets map[string]string
}

func (f *fakeSourceRepoForHandler) CreateSource(_ context.Context, sc *domain.SourceConnection) error {
	f.sources[sc.ID] = sc
	return nil
}

func (f *fakeSourceRepoForHandler) CreateSourceWithCredential(_ context.Context, sc *domain.SourceConnection, cr *domain.CredentialRef, enc string) error {
	f.creds[cr.ID] = cr
	f.secrets[cr.ID] = enc
	f.sources[sc.ID] = sc
	return nil
}

// GetSource enforces workspace isolation: only returns the source when workspace matches.
func (f *fakeSourceRepoForHandler) GetSource(_ context.Context, workspaceID, id string) (*domain.SourceConnection, error) {
	v, ok := f.sources[id]
	if !ok {
		return nil, repo.ErrNotFound
	}
	sc := v.(*domain.SourceConnection)
	if sc.WorkspaceID != workspaceID {
		return nil, repo.ErrNotFound
	}
	return sc, nil
}

func (f *fakeSourceRepoForHandler) ListSources(_ context.Context, workspaceID string) ([]*domain.SourceConnection, error) {
	var result []*domain.SourceConnection
	for _, v := range f.sources {
		sc := v.(*domain.SourceConnection)
		if sc.WorkspaceID == workspaceID {
			result = append(result, sc)
		}
	}
	return result, nil
}

func (f *fakeSourceRepoForHandler) UpdateSourceStatus(_ context.Context, id string, status domain.SourceStatus, testedAt, syncedAt *time.Time) error {
	if v, ok := f.sources[id]; ok {
		v.(*domain.SourceConnection).Status = status
	}
	return nil
}

func (f *fakeSourceRepoForHandler) AttachCredential(_ context.Context, sourceID, credentialID string) error {
	return nil
}

func (f *fakeSourceRepoForHandler) CreateCredential(_ context.Context, cr *domain.CredentialRef, enc string) error {
	f.creds[cr.ID] = cr
	f.secrets[cr.ID] = enc
	return nil
}

func (f *fakeSourceRepoForHandler) GetCredential(_ context.Context, id string) (*domain.CredentialRef, error) {
	v, ok := f.creds[id]
	if !ok {
		return nil, repo.ErrNotFound
	}
	return v.(*domain.CredentialRef), nil
}

// GetEncryptedSecret is workspace-scoped: credential must belong to the given workspace.
func (f *fakeSourceRepoForHandler) GetEncryptedSecret(_ context.Context, workspaceID, credentialID string) (string, error) {
	enc, ok := f.secrets[credentialID]
	if !ok {
		return "", repo.ErrNotFound
	}
	// Verify the credential belongs to this workspace.
	if v, ok := f.creds[credentialID]; ok {
		if v.(*domain.CredentialRef).WorkspaceID != workspaceID {
			return "", repo.ErrNotFound
		}
	}
	return enc, nil
}

// withTestWorkspace injects a fake JWT claims context into the request so that
// workspaceID(r) returns the given workspace rather than returning "".
// Use this in handler tests that bypass the auth middleware.
func withTestWorkspace(r *http.Request, workspace string) *http.Request {
	claims := &auth.Claims{Workspace: workspace}
	ctx := context.WithValue(r.Context(), middleware.ClaimsKey, claims)
	return r.WithContext(ctx)
}
