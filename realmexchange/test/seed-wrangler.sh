echo "Use this script if the database doesn't already exist"
# Auto enter Y to any prompts
echo Y | wrangler d1 migrations apply realm-exchange --local --persist-to=../.wrangler
wrangler d1 execute realm-exchange --local --persist-to=../.wrangler --file=./test/seed-data.sql