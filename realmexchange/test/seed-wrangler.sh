echo "Use this script if the database doesn't already exist"
# Check if ../.wrangler already exists
if [ -d "../.wrangler" ]; then
  echo "../.wrangler already exists. Exiting to avoid overwriting existing database."
  exit 0
fi
# Auto enter Y to any prompts
echo Y | wrangler d1 migrations apply realm-exchange --local --persist-to=../.wrangler
wrangler d1 execute realm-exchange --local --persist-to=../.wrangler --file=./test/seed-data.sql