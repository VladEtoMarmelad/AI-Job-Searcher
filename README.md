# Project Setup

## Environment Variables
Create a `.env` file in the root directory and fill it in following the instructions in `.env.example`.

## Installation
Navigate to the backend directory and install dependencies:
```bash
cd ai-job-searcher-backend
pnpm install
```

## Running the Application

All commands must be executed from the `ai-job-searcher-backend` directory.

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```