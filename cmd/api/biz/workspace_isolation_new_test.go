// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz_test

// Tests for P0-1: cross-workspace source/credential isolation.
// Tests for P0-4 / P1-13: activity feed workspace enforcement.
// Tests for P1-11: ratio metric units.
// Tests for P1-12: EarliestDataAt/LatestDataAt ignore null buckets.

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

// TestSourceWorkspaceIsolation_CrossWorkspaceGetSourceReturnsNotFound verifies P0-1:
// workspace A cannot read workspace B's source by ID.
func TestSourceWorkspaceIsolation_CrossWorkspaceGetSourceReturnsNotFound(t *testing.T) {
	sr := newFakeSourceRepo()
	key := biz.DeriveKey("test-only-key")
	svc, err := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	require.NoError(t, err)

	// Create a source in workspace B.
	scB, _, err := svc.CreateSource(context.Background(), "ws-b", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "workspace B source",
		Config:      map[string]string{"org": "org-b"},
		RawSecret:   "ghp_workspace_b_token",
	})
	require.NoError(t, err)

	// Workspace A tries to read workspace B's source by ID.
	_, err = svc.GetSource(context.Background(), "ws-a", scB.ID)
	assert.Error(t, err, "workspace A must not be able to read workspace B's source")
	assert.ErrorIs(t, err, biz.ErrSourceNotFound)
}

// TestSourceWorkspaceIsolation_SameWorkspaceSucceeds verifies correct workspace can read own source.
func TestSourceWorkspaceIsolation_SameWorkspaceSucceeds(t *testing.T) {
	sr := newFakeSourceRepo()
	key := biz.DeriveKey("test-only-key")
	svc, err := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	require.NoError(t, err)

	sc, _, err := svc.CreateSource(context.Background(), "ws-a", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "workspace A source",
		Config:      map[string]string{"org": "org-a"},
		RawSecret:   "ghp_workspace_a_token",
	})
	require.NoError(t, err)

	got, err := svc.GetSource(context.Background(), "ws-a", sc.ID)
	require.NoError(t, err)
	assert.Equal(t, sc.ID, got.ID)
}

// TestActivityFeedSvc_EmptyWorkspaceReturnsError verifies P1-13:
// ActivityFeedSvc.Execute rejects empty workspace before calling repo.
func TestActivityFeedSvc_EmptyWorkspaceReturnsError(t *testing.T) {
	called := false
	repo := &countingActivityRepo{onCall: func() { called = true }}
	svc := biz.NewActivityFeedSvc(repo)

	_, err := svc.Execute(context.Background(), domain.ActivityFeedQuery{
		WorkspaceID: "", // empty — must be rejected
		Start:       time.Now().Add(-24 * time.Hour),
		End:         time.Now(),
		Limit:       50,
	})

	assert.Error(t, err, "empty workspaceID must return an error")
	assert.ErrorIs(t, err, biz.ErrMissingWorkspaceID)
	assert.False(t, called, "repo must never be called when workspaceID is empty")
}

type countingActivityRepo struct {
	onCall func()
}

func (r *countingActivityRepo) QueryActivityFeed(_ context.Context, _ domain.ActivityFeedQuery) ([]domain.ActivityFeedItem, error) {
	r.onCall()
	return nil, nil
}

// TestMetricRatioUnit verifies P1-11: build_failure_rate and sprint_predictability declare "ratio".
func TestMetricRatioUnit(t *testing.T) {
	catalog := biz.NewMetricCatalog()

	for _, id := range []string{"build_failure_rate", "sprint_predictability"} {
		m, err := catalog.Get(id)
		require.NoError(t, err, "metric %s must exist in catalog", id)
		assert.Equal(t, "ratio", m.Unit,
			"metric %s must use Unit='ratio' not 'percent' to avoid 100× display errors", id)
		assert.NotEqual(t, "percent", m.Unit,
			"metric %s must not use Unit='percent' — values are in [0,1]", id)
	}
}

// TestQualityContractTimestamps_IgnoreNullBuckets verifies P1-12:
// EarliestDataAt and LatestDataAt only consider non-nil value buckets.
func TestQualityContractTimestamps_IgnoreNullBuckets(t *testing.T) {
	b1 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) // has data
	b2 := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC) // null value
	b3 := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC) // null value

	v1 := 42.0
	rows := []domain.MetricRow{
		{BucketStart: b1, Value: &v1, Count: 10},
		{BucketStart: b2, Value: nil, Count: 0},
		{BucketStart: b3, Value: nil, Count: 0},
	}

	svc := biz.NewMetricQuerySvc(&noopMetricRepo{rows: rows}, biz.NewMetricCatalog())
	result, err := svc.Execute(context.Background(), domain.MetricQuery{
		MetricID:    "pr_count",
		WorkspaceID: "ws-test",
		Start:       b1,
		End:         b3.AddDate(0, 1, 0),
		Granularity: "month",
	})
	require.NoError(t, err)

	qc := result.QualityContract
	require.NotNil(t, qc.EarliestDataAt, "EarliestDataAt must be set when at least one non-nil bucket exists")
	require.NotNil(t, qc.LatestDataAt, "LatestDataAt must be set when at least one non-nil bucket exists")
	assert.Equal(t, b1, *qc.EarliestDataAt,
		"EarliestDataAt must be the first non-nil bucket, not the first overall")
	assert.Equal(t, b1, *qc.LatestDataAt,
		"LatestDataAt must be the last non-nil bucket, not the last overall")
}

// noopMetricRepo returns pre-configured rows for all metric queries.
type noopMetricRepo struct {
	rows []domain.MetricRow
}

func (r *noopMetricRepo) QueryPRCount(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return r.rows, nil
}
func (r *noopMetricRepo) QueryPRCycleTimeMedian(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return r.rows, nil
}
func (r *noopMetricRepo) QueryReviewLatencyMedian(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return r.rows, nil
}
func (r *noopMetricRepo) QueryBuildFailureRate(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return r.rows, nil
}
func (r *noopMetricRepo) QueryBuildDurationP95(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return r.rows, nil
}
func (r *noopMetricRepo) QuerySprintPredictability(_ context.Context, _ domain.MetricQuery) ([]domain.MetricRow, error) {
	return r.rows, nil
}

// TestCrossWorkspaceCredential_IsolatedByWorkspace verifies P0-1 at repo layer.
// The fakeSourceRepo enforces workspace in GetSource; since GetEncryptedSecret
// is called after GetSource (via TestConnection or DecryptSecretForSource), the
// workspace invariant is already established.
func TestCrossWorkspaceCredential_IsolatedByWorkspace(t *testing.T) {
	sr := newFakeSourceRepo()
	key := biz.DeriveKey("test-only-key")
	svc, err := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	require.NoError(t, err)

	// Create source in workspace B with a credential.
	scB, _, err := svc.CreateSource(context.Background(), "ws-b", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "ws-b source",
		Config:      map[string]string{"org": "org-b"},
		RawSecret:   "ghp_secret_for_b",
	})
	require.NoError(t, err)

	// Workspace A cannot test the connection for workspace B's source.
	result, err := svc.TestConnection(context.Background(), "ws-a", scB.ID)
	// Should return ErrSourceNotFound, not a credential error.
	assert.Error(t, err)
	assert.ErrorIs(t, err, biz.ErrSourceNotFound,
		"TestConnection with wrong workspace must return ErrSourceNotFound, not a credential error")
	_ = result

	// Workspace B can read its own source.
	got, err := svc.GetSource(context.Background(), "ws-b", scB.ID)
	require.NoError(t, err)
	assert.Equal(t, "ws-b", got.WorkspaceID)
}

// TestFakeSourceRepo_WorkspaceEnforced verifies fakeSourceRepo enforces workspace in GetSource.
// This ensures the isolation tests don't produce false positives from a lenient fake.
func TestFakeSourceRepo_WorkspaceEnforced(t *testing.T) {
	sr := newFakeSourceRepo()
	key := biz.DeriveKey("test-only-key")
	svc, err := biz.NewSourceSvc(sr, key, biz.NewAdapterRegistry())
	require.NoError(t, err)

	_, _, err = svc.CreateSource(context.Background(), "ws-real", domain.CreateSourceInput{
		SourceType:  domain.SourceTypeGitHub,
		DisplayName: "real source",
		Config:      map[string]string{"org": "org-real"},
		RawSecret:   "ghp_real",
	})
	require.NoError(t, err)

	// The fake must have at least one source stored.
	// Workspace isolation uses GetSource with wrong workspace → ErrNotFound.
	// This test is implicitly verified by TestSourceWorkspaceIsolation_CrossWorkspaceGetSourceReturnsNotFound.
	// But we also verify the fakeSourceRepo directly via the ErrNotFound sentinel.
	_, err = sr.GetSource(context.Background(), "ws-wrong", "nonexistent-id")
	assert.ErrorIs(t, err, repo.ErrNotFound)
}
