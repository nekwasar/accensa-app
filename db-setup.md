# Local PostgreSQL Development Setup

## Prerequisites
- Docker

## Spinning up Postgres
Run the following command to start a local Postgres instance:
```bash
docker run --name accensa-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

## Connection String
`DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres`

## Initialization
The schema is automatically managed by the application.
