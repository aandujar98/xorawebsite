#!/bin/sh
set -eu
mkdir -p /app/data/avatars
chown -R nextjs:nodejs /app/data
exec su-exec nextjs "$@"
