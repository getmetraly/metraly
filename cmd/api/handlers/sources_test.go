// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/getmetraly/metraly/cmd/api/biz"
	"github.com/getmetraly/metraly/cmd/api/handlers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSourceHandler_Create_MissingSourceType(t *testing.T) {
	key := biz.DeriveKey("test-secret-key-for-handler-tests")
	repo := &fakeSourceRepoForHandler{sources: map[string]any{}, creds: map[string]any{}, secrets: map[string]string{}}
	svc, err := biz.NewSourceSvc(repo, key)
	require.NoError(t, err)
	h := handlers.NewSourceHandler(svc)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources", bytes.NewReader([]byte(`{"displayName":"test","secret":"tok"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Create(rec, req)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}
func TestSourceHandler_Create_MissingSecret(t *testing.T) {
	key := biz.DeriveKey("test-secret-key-for-handler-tests")
	repo := &fakeSourceRepoForHandler{sources: map[string]any{}, creds: map[string]any{}, secrets: map[string]string{}}
	svc, err := biz.NewSourceSvc(repo, key)
	require.NoError(t, err)
	h := handlers.NewSourceHandler(svc)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources", bytes.NewReader([]byte(`{"sourceType":"github","displayName":"test"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Create(rec, req)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}
func TestSourceHandler_Create_HappyPath(t *testing.T) {
	key := biz.DeriveKey("test-secret-key-for-handler-tests")
	repo := &fakeSourceRepoForHandler{sources: map[string]any{}, creds: map[string]any{}, secrets: map[string]string{}}
	svc, err := biz.NewSourceSvc(repo, key)
	require.NoError(t, err)
	h := handlers.NewSourceHandler(svc)
	body := []byte(`{"sourceType":"github","displayName":"test","secret":"ghp_testtoken1234","config":{"org":"acme"}}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Create(rec, req)
	assert.Equal(t, http.StatusCreated, rec.Code)
	var resp map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	assert.Contains(t, resp, "source")
	assert.Contains(t, resp, "credential")
	assert.NotContains(t, rec.Body.String(), "ghp_testtoken1234")
}
func TestSourceHandler_Create_ResponseNoRawSecret(t *testing.T) {
	key := biz.DeriveKey("test-secret-key-for-handler-tests")
	repo := &fakeSourceRepoForHandler{sources: map[string]any{}, creds: map[string]any{}, secrets: map[string]string{}}
	svc, err := biz.NewSourceSvc(repo, key)
	require.NoError(t, err)
	h := handlers.NewSourceHandler(svc)
	secret := "superprivatesecrettoken"
	body, _ := json.Marshal(map[string]any{"sourceType": "jira", "displayName": "Jira", "secret": secret, "config": map[string]string{"project": "PROJ"}})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sources", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Create(rec, req)
	assert.Equal(t, http.StatusCreated, rec.Code)
	assert.NotContains(t, rec.Body.String(), secret)
}
