// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/redis/go-redis/v9"
)

type DashboardCache interface {
	Get(ctx context.Context, id string) (*domain.Dashboard, error)
	Set(ctx context.Context, d *domain.Dashboard) error
	Delete(ctx context.Context, id string) error
}

type redisDashboardCache struct {
	rdb *redis.Client
	ttl time.Duration
}

func NewDashboardCache(rdb *redis.Client, ttl time.Duration) DashboardCache {
	return &redisDashboardCache{rdb: rdb, ttl: ttl}
}

type noopDashboardCache struct{}

func NewNoopDashboardCache() DashboardCache {
	return noopDashboardCache{}
}

func (c *redisDashboardCache) key(id string) string { return "dashboard:" + id }

func (c *redisDashboardCache) Get(ctx context.Context, id string) (*domain.Dashboard, error) {
	data, err := c.rdb.Get(ctx, c.key(id)).Bytes()
	if err != nil {
		return nil, err
	}
	var d domain.Dashboard
	if err := json.Unmarshal(data, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

func (c *redisDashboardCache) Set(ctx context.Context, d *domain.Dashboard) error {
	b, err := json.Marshal(d)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, c.key(d.ID), b, c.ttl).Err()
}

func (c *redisDashboardCache) Delete(ctx context.Context, id string) error {
	return c.rdb.Del(ctx, c.key(id)).Err()
}

func (noopDashboardCache) Get(ctx context.Context, id string) (*domain.Dashboard, error) {
	return nil, ErrCacheMiss
}

func (noopDashboardCache) Set(ctx context.Context, d *domain.Dashboard) error {
	return nil
}

func (noopDashboardCache) Delete(_ context.Context, _ string) error {
	return nil
}
