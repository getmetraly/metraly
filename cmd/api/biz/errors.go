// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package biz

import "errors"

var (
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("version conflict")
	ErrForbidden    = errors.New("forbidden")
	ErrValidation   = errors.New("validation error")
	ErrUnauthorized = errors.New("unauthorized")
)

var (
	// ErrUnsupportedGroupBy is returned when a query requests groupBy dimensions
	// that are not yet implemented. Callers should map this to HTTP 400.
	ErrUnsupportedGroupBy = errors.New("unsupported groupBy dimensions")
	// ErrUnsupportedFilter is returned when a query contains an unknown filter key.
	// Callers should map this to HTTP 400.
	ErrUnsupportedFilter = errors.New("unsupported filter key")
)
