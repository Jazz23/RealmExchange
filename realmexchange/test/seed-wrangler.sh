echo "Use this script if the database doesn't already exist"
wrangler d1 execute realm-exchange --local --persist-to=../.wrangler --file src/lib/server/db/migrations/0000_spooky_gideon.sql
wrangler d1 execute realm-exchange --local --persist-to=../.wrangler --command "INSERT INTO user (id, username) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Jazz');"