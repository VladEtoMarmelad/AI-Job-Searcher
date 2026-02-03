## Project Setup

1.  **Environment Variables**
Create a `.env` file in the root directory and fill it in following the instructions in `.env.example`.

2.  **Local AI Model**
The application requires a local AI model to be running.
* Install [Ollama](https://ollama.com/).
* Run the model using:
```bash
ollama run <model_name>
```
* Note: The required model name is defined in `ai-job-searcher-backend/src/modules/ai/ai.service.ts`.

3.  **Installation**
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