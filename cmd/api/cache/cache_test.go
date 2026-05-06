// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package cache

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func getRedisClient() *redis.Client {
	return redis.NewClient(&redis.Options{Addr: "localhost:6379"})
}

func redisAvailable() bool {
	conn, err := net.DialTimeout("tcp", "localhost:6379", time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func TestMetricsCache_GetMiss(t *testing.T) {
	if !redisAvailable() {
		t.Skip("Redis not available")
	}

	rdb := getRedisClient()
	defer rdb.Close()

	c := NewMetricsCache(rdb, time.Minute*5)

	_, err := c.Get(context.Background(), "deploy-freq", "Platform")
	assert.ErrorIs(t, err, ErrCacheMiss)
}

func TestMetricsCache_GetSet(t *testing.T) {
	if !redisAvailable() {
		t.Skip("Redis not available")
	}

	rdb := getRedisClient()
	defer rdb.Close()

	c := NewMetricsCache(rdb, time.Minute*5)
	ctx := context.Background()

	pts := []domain.MetricDataPoint{
		{Time: time.Now(), Value: 42},
		{Time: time.Now().Add(time.Hour), Value: 100},
	}

	err := c.Set(ctx, "deploy-freq", "Platform", pts)
	require.NoError(t, err)

	got, err := c.Get(ctx, "deploy-freq", "Platform")
	require.NoError(t, err)
	require.Len(t, got, len(pts))
	for i := range pts {
		assert.True(t, pts[i].Time.Equal(got[i].Time))
		assert.Equal(t, pts[i].Value, got[i].Value)
	}
}

func TestDashboardCache_GetSet(t *testing.T) {
	if !redisAvailable() {
		t.Skip("Redis not available")
	}

	rdb := getRedisClient()
	defer rdb.Close()

	c := NewDashboardCache(rdb, time.Minute*5)
	ctx := context.Background()

	dash := &domain.Dashboard{
		ID:          "test-dash-1",
		Name:        "Test Dashboard",
		Description: "A test dashboard",
		Widgets:     []domain.WidgetInstance{},
	}

	err := c.Set(ctx, dash)
	require.NoError(t, err)

	got, err := c.Get(ctx, "test-dash-1")
	require.NoError(t, err)
	assert.Equal(t, dash.ID, got.ID)
	assert.Equal(t, dash.Name, got.Name)
}

func TestTemplateCache_GetSet(t *testing.T) {
	if !redisAvailable() {
		t.Skip("Redis not available")
	}

	rdb := getRedisClient()
	defer rdb.Close()

	c := NewTemplateCache(rdb, time.Minute*5)
	ctx := context.Background()

	templates := []*domain.DashboardTemplate{
		{ID: "tpl1", Name: "Template 1"},
		{ID: "tpl2", Name: "Template 2"},
	}

	err := c.Set(ctx, templates)
	require.NoError(t, err)

	got, err := c.Get(ctx)
	require.NoError(t, err)
	assert.Len(t, got, 2)
	assert.Equal(t, "tpl1", got[0].ID)
}
