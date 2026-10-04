# Local verification

Run this before pushing any branch for review:

```bash
pnpm verify                      # compare against ERP.SLICT.LK
pnpm verify -- --base <ref>      # compare against another branch
pnpm verify -- --with-ai         # also test SLICT's AI on a local model
```

It needs Docker. It writes `.verify/report.md`; paste that into the pull request. The same
script runs on every pull request through `.github/workflows/verify.yml`.

## What it checks

| Gate | Fails when |
| --- | --- |
| Secrets (gitleaks) | a commit on this branch contains a secret, including a password in a database URL or a password string literal (`.gitleaks.toml`) |
| Fallback secrets | the branch adds a `process.env.X_SECRET \|\| 'value'` default |
| Type-check | a type error appears that is not in `scripts/verify/tsc-baseline.txt` |
| Unit tests | any test fails on a UTC clock, as on the server |
| Migration safety | `schema.prisma` changed without a migration, a migration fails on today's schema, or the result differs from `schema.prisma` |
| Local AI | with `--with-ai`: SLICT's Ollama client gets no answer from a local model |

Gates judge what a branch **adds**. Problems already on the base branch do not fail it:
they are counted against the base, or listed in the type-check baseline.

## Safety

- Everything runs against throwaway containers from `docker-compose.verify.yml`. The database
  lives in memory (`tmpfs`), listens on `127.0.0.1` only, and gets a new password each run.
- The script sets `DATABASE_URL` to that container before any Prisma command, so a real URL in
  `.env` is never used.
- Use synthetic data only. Never load production data or customer records into these services.

**What no scanner can catch.** A password written into a sentence looks like any other word. When
documenting a leaked secret, give its location (file and line), never its value.

## Local AI

`--with-ai` starts Ollama, pulls `qwen2.5:0.5b` (about 400 MB, cached after the first run;
choose another with `VERIFY_AI_MODEL`) and calls `src/lib/ai/ollama-client.ts` with a synthetic
prompt. Nothing is sent to a cloud AI service.

Known issues in the app's local AI code, left for a separate change:

- Two Ollama clients read three different URL variables: `OLLAMA_URL` and `OLLAMA_API_URL`
  in `src/lib/ollama.ts`, `OLLAMA_BASE_URL` in `src/lib/ai/ollama-client.ts`. `.env.ollama`
  sets only `OLLAMA_API_URL`. The script sets all three.
- `ollama-client.ts` uses `options?.temperature || 0.7`, so a requested temperature of `0`
  becomes `0.7`.
- The default model is `llama2`.

## After the script passes

These cannot run inside a script:

1. Claude Code `/security-review` on the branch.
2. Claude Code `/code-review` on the branch.
3. Antigravity second opinion.
4. Paste the report and all three reviews into the pull request.
