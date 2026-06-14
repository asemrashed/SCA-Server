-- Promote existing platform admins to SUPER_ADMIN.
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
