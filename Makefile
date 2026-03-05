.PHONY: dev build start docker-up docker-down test test-cov lint

dev:
	npm run start:dev

build:
	npm run build

start:
	npm run start:prod

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

test:
	npm run test

test-cov:
	npm run test:cov

lint:
	npm run lint

setup: docker-up
	@echo "Waiting for Postgres to be ready..."
	@sleep 3
	@echo "Infrastructure up. Run 'make dev' to start the app."
