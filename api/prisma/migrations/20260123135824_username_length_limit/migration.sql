-- Step 1: Truncate existing long names (preserves all records)
UPDATE users SET name = LEFT(name, 30) WHERE LENGTH(name) > 30;

-- Step 2: Add VARCHAR(30) constraint
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(30);
