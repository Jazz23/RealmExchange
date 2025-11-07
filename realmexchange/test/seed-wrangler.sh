echo "Use this script if the database doesn't already exist"
wrangler d1 migrations apply realm-exchange --local --persist-to=../.wrangler
wrangler d1 execute realm-exchange --local --persist-to=../.wrangler --command "INSERT INTO user (id, username) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Jazz');"