// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package retry

import (
	"context"
	"time"
)

const (
	MaxRetries = 3
)

var delays = []int{1000, 4000, 16000}

func WithRetry(ctx context.Context, fn func() error) error {
	var lastErr error
	for i := 0; i < MaxRetries; i++ {
		if err := fn(); err != nil {
			lastErr = err
			timer := time.NewTimer(time.Duration(delays[i]) * time.Millisecond)
			select {
			case <-ctx.Done():
				if !timer.Stop() {
					<-timer.C
				}
				return ctx.Err()
			case <-timer.C:
			}
			continue
		}
		return nil
	}
	return lastErr
}
