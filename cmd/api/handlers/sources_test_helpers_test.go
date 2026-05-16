// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"context"
	"time"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/domain"
)

type fakeSourceRepoForHandler struct {
	sources map[string]any
	creds   map[string]any
	secrets map[string]string
}

func (f *fakeSourceRepoForHandler) CreateSource(_ context.Context, sc *domain.SourceConnection) error {
	f.sources[sc.ID] = sc
	return nil
}
func (f *fakeSourceRepoForHandler) GetSource(_ context.Context, id string) (*domain.SourceConnection, error) {
	v, ok := f.sources[id]
	if !ok {
		return nil, biz.ErrSourceNotFound
	}
	return v.(*domain.SourceConnection), nil
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
		return nil, biz.ErrCredentialNotFound
	}
	return v.(*domain.CredentialRef), nil
}
func (f *fakeSourceRepoForHandler) GetEncryptedSecret(_ context.Context, credentialID string) (string, error) {
	return f.secrets[credentialID], nil
}
