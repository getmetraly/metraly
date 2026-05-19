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
	// ErrMissingWorkspaceID is returned when a query omits the required workspaceId.
	// Callers should map this to HTTP 400.
	ErrMissingWorkspaceID = errors.New("workspaceId is required")
)

var (
	// ErrDashboardNotFound is returned when a dashboard does not exist or
	// the requesting user is not allowed to see it (prefer 404 over 403 to
	// avoid dashboard ID enumeration).
	ErrDashboardNotFound = errors.New("dashboard not found")
	// ErrDashboardAccessDenied is returned when a user attempts to mutate a
	// dashboard they do not own. Handlers map this to 404 to avoid enumeration.
	ErrDashboardAccessDenied = errors.New("dashboard access denied")
)
