set -e
cd ~/joa-integrations
free -g | sed -n 2p
sudo docker rm -f joa-ap-test >/dev/null 2>&1 || true
sudo docker volume rm joa-ap-test-data >/dev/null 2>&1 || true
rm -f ~/joa-integrations/_aptest/state.json
sudo docker image inspect activepieces/activepieces:latest --format '{{.Size}} {{index .Config.Labels "org.opencontainers.image.version"}}'
sudo docker run -d --name joa-ap-test --memory 4g --cpus 2 -p 127.0.0.1:18080:18080 -e AP_PORT=18080 \
  -v joa-ap-test-data:/root/.activepieces \
  -e AP_DB_TYPE=PGLITE -e AP_REDIS_TYPE=MEMORY -e AP_FRONTEND_URL=http://127.0.0.1:18080 \
  -e AP_ENCRYPTION_KEY=$(openssl rand -hex 16) -e AP_JWT_SECRET=$(openssl rand -hex 32) \
  -e AP_TELEMETRY_ENABLED=false -e AP_PIECES_SYNC_MODE=NONE \
  activepieces/activepieces:latest
for i in $(seq 1 60); do
  c=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18080/api/v1/flags || true)
  if [ "$c" = "200" ]; then echo "UP after $((i*5))s"; break; fi; sleep 5; done
sudo docker logs joa-ap-test 2>&1 | tail -5 | cut -c1-300
sudo docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' joa-ap-test
curl -s http://127.0.0.1:18080/api/v1/flags | python3 -c "import json,sys;d=json.load(sys.stdin);print({k:d.get(k) for k in ['CURRENT_VERSION','EDITION','ENVIRONMENT','USER_CREATED']})"