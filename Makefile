.PHONY: dev build start docker-up docker-down test lint

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

lint:
	npm run lint
