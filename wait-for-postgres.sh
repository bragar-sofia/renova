#!/bin/sh

# Wait for db
echo "⏳ Waiting for PostgreSQL at $DATABASE_HOST:$DATABASE_PORT..."

while ! nc -z "$DATABASE_HOST" "$DATABASE_PORT"; do
  sleep 1
done

echo "✅ PostgreSQL is up — executing command"
exec "$@"
