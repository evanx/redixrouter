
cd ~/redixrouter

[ -d tmp ] || echo "Note that ~/redixrouter/tmp directory will be created by scripts/test/all.sh"

echo "nc -vz localhost 6379"
if ! nc -vz localhost 6379 
then
  echo "WARNING: Redis not running on localhost port 6379, so tests will not work"
  exit 1
fi

echo "Note that tests will create Redis keys prefixed with 'redix:test'"

echo "redis-cli keys 'redix:test:*'"
redis-cli keys 'redix:test:*'

