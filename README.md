![Screenshot](./Screenshot.png)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

You need to have:
- Node (I used `v24.7.0`)
- pnpm (I used `10.12.4`)
- Docker and Docker Compose
- An OpenAI API Key


First create a file in the ROOT directory of your project. Named `.env.local` 

Copy paste the following (DO NOT forget to replace the value of `OPENAI_API_KEY` with your own)

```
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydatabase
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536
CHAT_MODEL=gpt-4o-mini
```

Start Docker and then run `docker compose up -d`

Apply the migrations - `pnpm db:migrate`

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
