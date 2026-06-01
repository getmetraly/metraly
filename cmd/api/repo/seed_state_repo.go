package repo

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SeedStateRepo interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, value string) error
	Delete(ctx context.Context, key string) error
}

type pgSeedStateRepo struct{ pool *pgxpool.Pool }

func NewSeedStateRepo(pool *pgxpool.Pool) SeedStateRepo { return &pgSeedStateRepo{pool: pool} }

func (r *pgSeedStateRepo) Get(ctx context.Context, key string) (string, bool, error) {
	var value string
	err := r.pool.QueryRow(ctx, `SELECT value FROM seed_state WHERE key=$1`, key).Scan(&value)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", false, nil
		}
		return "", false, err
	}
	return value, true, nil
}

func (r *pgSeedStateRepo) Set(ctx context.Context, key, value string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO seed_state(key, value, updated_at)
		VALUES($1, $2, NOW())
		ON CONFLICT (key)
		DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
	`, key, value)
	return err
}

func (r *pgSeedStateRepo) Delete(ctx context.Context, key string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM seed_state WHERE key=$1`, key)
	return err
}
