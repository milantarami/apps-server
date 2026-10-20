IMAGE := push-dashboard
CONTAINER := push-dashboard
PORT ?= 5178
ENV ?= local
ENV_FILE := .env.$(ENV)

.PHONY: help check-env install dev build start typecheck docker-build docker-run docker-stop docker-logs docker-clean

help:
	@echo "make install       Install dependencies"
	@echo "make dev           Run with hot reload on http://127.0.0.1:$(PORT)"
	@echo "make build         Type-check and build the UI"
	@echo "make start         Serve the build with Node"
	@echo "make typecheck     Type-check only"
	@echo "make docker-build  Build the Docker image"
	@echo "make docker-run    Run the image on http://127.0.0.1:$(PORT)"
	@echo "make docker-stop   Stop and remove the container"
	@echo "make docker-logs   Follow the container logs"
	@echo "make docker-clean  Remove the container and the image"
	@echo ""
	@echo "dev, start and docker-run read .env.local by default; add ENV=prod for .env.prod"

check-env:
	@case "$(ENV)" in local|prod) ;; *) echo "ENV must be local or prod (got '$(ENV)')"; exit 1;; esac
	@test -f $(ENV_FILE) || { echo "Missing $(ENV_FILE) - run: cp .env.example $(ENV_FILE) and fill it in"; exit 1; }

install:
	pnpm install

dev: check-env
	ENV_FILE=$(ENV_FILE) pnpm dev

build:
	pnpm build

start: check-env build
	ENV_FILE=$(ENV_FILE) pnpm start

typecheck:
	pnpm typecheck

docker-build:
	docker build -t $(IMAGE) .
	@docker image prune -f --filter label=app=$(IMAGE) >/dev/null
	@docker image ls $(IMAGE) --format "{{.Repository}}:{{.Tag}}  {{.Size}}"

docker-run: check-env
	-@docker rm -f $(CONTAINER) >/dev/null 2>&1
	docker run -d --name $(CONTAINER) --env-file $(ENV_FILE) -e DASHBOARD_HOST=0.0.0.0 -e DASHBOARD_PORT=$(PORT) \
		-p 127.0.0.1:$(PORT):$(PORT) --restart unless-stopped $(IMAGE)
	@echo "Push dashboard: http://127.0.0.1:$(PORT)"

docker-stop:
	-docker rm -f $(CONTAINER)

docker-logs:
	docker logs -f $(CONTAINER)

docker-clean: docker-stop
	-docker image rm $(IMAGE)
