# GamTrackr

Plataforma PWA de registo de eventos desportivos em tempo real.  
Stack: React + Vite + Supabase + Dexie (offline-first).

---

## Ambientes

| Ambiente | Branch | URL | Supabase Project |
|----------|--------|-----|-----------------|
| **Production** | `main` | [gamtrackr.eu](https://gamtrackr.eu) | `gamtrackr-prod` |
| **Staging** | `staging` | [staging.gamtrackr.eu](https://staging.gamtrackr.eu) | `gamtrackr-staging` |
| **Dev** | `dev` | [dev.gamtrackr.eu](https://dev.gamtrackr.eu) | `gamtrackr-dev` |

---

## Fluxo de trabalho

```
dev  ──PR──▶  staging  ──PR──▶  main
```

1. **Desenvolvimento diário** — trabalha na branch `dev`.
2. **Testes de integração** — abre PR de `dev` → `staging`; valida em `staging.gamtrackr.eu`.
3. **Release** — abre PR de `staging` → `main`; deploy automático para produção.

> Nunca faças merge directo de `dev` para `main`.

---

## Setup local

```bash
git clone https://github.com/alertadesportoformacao-collab/GamTrackr
cd GamTrackr
npm install
```

Cria um ficheiro `.env` na raiz (nunca commitar):

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Ver `.env.staging.example` e `.env.dev.example` para a estrutura dos ambientes staging/dev.

```bash
npm run dev   # servidor de desenvolvimento local
npm run build # build de produção
```

---

## Variáveis de ambiente por branch

As variáveis de ambiente dos deploys Vercel são configuradas no **Vercel Dashboard**  
→ Project Settings → Environment Variables.

| Variável | Onde configurar |
|----------|----------------|
| `VITE_SUPABASE_URL` | Vercel → Env Vars (por ambiente) |
| `VITE_SUPABASE_ANON_KEY` | Vercel → Env Vars (por ambiente) |

Configura cada variável separadamente para **Production** (`main`), **Preview** → branch `staging`, e **Preview** → branch `dev`.

---

## Configurar domínios de preview no Vercel

No **Vercel Dashboard** → Project Settings → Domains:

1. `staging.gamtrackr.eu` → atribuir à branch `staging`
2. `dev.gamtrackr.eu` → atribuir à branch `dev`

Nos DNS do domínio `gamtrackr.eu`, adiciona os registos CNAME correspondentes apontados para o Vercel.

---

## Supabase migrations

```bash
# Aplica migrations na base de dados ligada ao CLI
npx supabase db push

# Nova migration
npx supabase migration new <nome>
```

As migrations ficam em `supabase/migrations/` e são partilhadas entre ambientes.  
Cada projeto Supabase (prod/staging/dev) precisa de `npx supabase db push` separado após ligar o CLI ao respectivo projeto.
