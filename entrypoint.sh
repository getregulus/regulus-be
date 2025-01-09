#!/bin/sh

# Check if the database has started
# We could also use ${POSTGRES_PORT:-5432} to provide a default value

if [ -n "$DB_HOST" ] && [ -n "${DB_PORT:-5432}" ]
then
    echo "Testing connection of DB"
    ./util/wait-for-it.sh "$DB_HOST:${DB_PORT:-5432}" --strict --timeout=5
fi

echo "starting migration"
npx prisma migrate deploy

echo "starting backend"
node src/server.js