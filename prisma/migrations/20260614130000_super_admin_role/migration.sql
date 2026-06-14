-- Add SUPER_ADMIN role (must be committed before use in a follow-up migration).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
