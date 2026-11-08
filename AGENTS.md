# Fairu Fashion — Project Guidelines & Guardrails

## Database Schema & Prisma Migration Protocol

When modifying the database schema or managing database models in `server/prisma/schema.prisma`:

1. **NEVER use direct push**:
   - Do NOT run `prisma db push` or `npx prisma db push`.
   - Never bypass the Prisma migration engine for schema updates.

2. **ALWAYS use versioned migrations**:
   - In development, generate and apply migrations using:
     ```bash
     cd server && npx prisma migrate dev --name <descriptive_migration_name>
     ```
   - For deployment / production environments, apply existing pending migrations using:
     ```bash
     cd server && npx prisma migrate deploy
     ```
   - Always regenerate the Prisma client after schema changes:
     ```bash
     cd server && npx prisma generate
     ```

3. **Verify Migration SQL**:
   - Inspect the generated SQL migration file under `server/prisma/migrations/<timestamp>_<name>/migration.sql` to verify safety and table changes before proceeding.
   - If a migration involves table alterations with existing data, ensure safe defaults or data preservation scripts rather than destructive drop/re-create operations.

