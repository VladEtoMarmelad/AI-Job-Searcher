# Project Setup

## Environment Variables
Create a `.env` file in the root directory and fill it in following the instructions in `.env.example`.

## Installation
Navigate to the backend directory and install dependencies:
```bash
cd ai-job-searcher-backend
pnpm install
```

Navigate to the frontend directory and install dependencies:
```bash
cd ai-job-searcher-frontend
pnpm install
```

## Running the Application

### Backend
All commands must be executed from the `ai-job-searcher-backend` directory.

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

### Frontend
All commands must be executed from the `ai-job-searcher-frontend` directory.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.