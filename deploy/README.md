# Deploy Notes

## Production Compose Skeleton

`docker-compose.prod.yml` defines a production-oriented single-host skeleton:

- `nginx` is the only public entrypoint and proxies `/api/` to `server`.
- `server` runs behind nginx and depends on healthy MySQL, Redis, MongoDB, and MinIO.
- Data services use named volumes and are isolated on the internal backend network.
- `deploy/nginx/conf.d/o2o.conf` is an HTTP-ready example. Enable TLS after placing certificates under `deploy/nginx/certs/` and updating the commented TLS guidance.

Bootstrap:

```bash
cp deploy/.env.prod.example deploy/.env.prod
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

All `change_me_*` values in `deploy/.env.prod.example` are placeholders. Use strong secrets in the untracked `deploy/.env.prod` file.
