#!/bin/sh

# Waiting for PostgreSQL
echo "⏳ Waiting for PostgreSQL at $DATABASE_HOST:$DATABASE_PORT..."
until nc -z "$DATABASE_HOST" "$DATABASE_PORT"; do
  sleep 1
done
echo "✅ PostgreSQL is up — executing migrations..."

# Migrations
npx db-migrate up --env=prod
if [ $? -ne 0 ]; then
  echo "❌ Migration failed. Exiting."
  exit 1
fi

echo "✅ Migrations complete. Launching Sails app..."
exec npm start
