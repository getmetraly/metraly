// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package repo

import (
	"context"

	"github.com/getmetraly/metraly/cmd/api/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo interface {
	FindByID(ctx context.Context, id string) (*domain.User, error)
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindByOIDCSub(ctx context.Context, sub string) (*domain.User, error)
	Create(ctx context.Context, u *domain.User, passwordHash string) error
	Upsert(ctx context.Context, u *domain.User, passwordHash string) error
	GetPasswordHash(ctx context.Context, email string) (userID, hash string, err error)
}

type pgUserRepo struct{ pool *pgxpool.Pool }

func NewUserRepo(pool *pgxpool.Pool) UserRepo { return &pgUserRepo{pool} }

func (r *pgUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	u := &domain.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, email, avatar, app_role FROM users WHERE id=$1`, id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Avatar, &u.Role)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *pgUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	u := &domain.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, email, avatar, app_role FROM users WHERE email=$1`, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Avatar, &u.Role)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *pgUserRepo) FindByOIDCSub(ctx context.Context, sub string) (*domain.User, error) {
	u := &domain.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, email, avatar, app_role FROM users WHERE oidc_sub=$1`, sub,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Avatar, &u.Role)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *pgUserRepo) Create(ctx context.Context, u *domain.User, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO users(id, name, email, avatar, app_role, password_hash)
		 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
		u.ID, u.Name, u.Email, u.Avatar, u.Role, passwordHash,
	)
	return err
}

func (r *pgUserRepo) Upsert(ctx context.Context, u *domain.User, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO users(id, name, email, avatar, app_role, password_hash)
		 VALUES($1,$2,$3,$4,$5,$6)
		 ON CONFLICT (email) DO UPDATE
		 SET id = EXCLUDED.id,
		     name = EXCLUDED.name,
		     avatar = EXCLUDED.avatar,
		     app_role = EXCLUDED.app_role,
		     password_hash = EXCLUDED.password_hash`,
		u.ID, u.Name, u.Email, u.Avatar, u.Role, passwordHash,
	)
	return err
}

func (r *pgUserRepo) GetPasswordHash(ctx context.Context, email string) (string, string, error) {
	var userID, hash string
	err := r.pool.QueryRow(ctx,
		`SELECT id, password_hash FROM users WHERE email=$1`, email,
	).Scan(&userID, &hash)
	return userID, hash, err
}
