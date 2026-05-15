/**
 * design-system — app-facing barrel
 *
 * Import all design-system primitives from here, never from individual
 * component paths. This indirection lets Phase 3 swap local implementations
 * for @metraly/ui imports in one file without touching every caller.
 *
 * Usage:
 *   import { StatusBadgeCompat, DataTableCompat } from '../design-system';
 */
export * from './compat/brandbook-legacy';
