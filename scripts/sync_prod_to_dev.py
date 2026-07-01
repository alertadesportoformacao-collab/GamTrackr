"""
Replica todos os dados de produção para dev.
Uso: python scripts/sync_prod_to_dev.py
"""
import sys
import json
import urllib.request
import urllib.error

import os

PROD_URL = os.environ.get("PROD_SUPABASE_URL", "")
PROD_KEY = os.environ.get("PROD_SUPABASE_SERVICE_KEY", "")
DEV_URL  = os.environ.get("DEV_SUPABASE_URL", "")
DEV_KEY  = os.environ.get("DEV_SUPABASE_SERVICE_KEY", "")

if not all([PROD_URL, PROD_KEY, DEV_URL, DEV_KEY]):
    print("Erro: define as variáveis de ambiente antes de correr:")
    print("  PROD_SUPABASE_URL, PROD_SUPABASE_SERVICE_KEY")
    print("  DEV_SUPABASE_URL,  DEV_SUPABASE_SERVICE_KEY")
    sys.exit(1)

def req(url, method="GET", data=None, extra_headers=None, key=None):
    k = key or PROD_KEY
    headers = {
        "apikey": k,
        "Authorization": f"Bearer {k}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    if extra_headers:
        headers.update(extra_headers)
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"  HTTP {e.code}: {msg[:200]}")
        return None

def prod_get(path):
    return req(f"{PROD_URL}{path}", key=PROD_KEY) or []

def dev_delete(table):
    # delete all rows using neq filter on a constant
    url = f"{DEV_URL}/rest/v1/{table}?id=neq.00000000-0000-0000-0000-000000000000"
    req(url, method="DELETE", key=DEV_KEY)

def dev_insert(table, rows):
    if not rows:
        return 0
    url = f"{DEV_URL}/rest/v1/{table}"
    req(url, method="POST", data=rows, key=DEV_KEY)
    return len(rows)

def get_auth_users(base_url, key):
    data = req(f"{base_url}/auth/v1/admin/users", key=key) or {}
    return data.get("users", []) if isinstance(data, dict) else []

def create_dev_user(email):
    data = req(
        f"{DEV_URL}/auth/v1/admin/users",
        method="POST",
        data={"email": email, "password": "DevTemp123!", "email_confirm": True},
        key=DEV_KEY,
    )
    return data.get("id") if data and "id" in data else None

# ── 1. Obter utilizadores de prod e criar em dev ──────────────────────────────
print("\n=== UTILIZADORES AUTH ===")
prod_users = get_auth_users(PROD_URL, PROD_KEY)
dev_users  = get_auth_users(DEV_URL,  DEV_KEY)
dev_by_email = {u["email"]: u["id"] for u in dev_users}

id_map = {}  # prod_auth_id -> dev_auth_id
for pu in prod_users:
    email = pu["email"]
    prod_id = pu["id"]
    if email in dev_by_email:
        id_map[prod_id] = dev_by_email[email]
        print(f"  [existe] {email}")
    else:
        new_id = create_dev_user(email)
        if new_id:
            id_map[prod_id] = new_id
            print(f"  [criado] {email} (pass: DevTemp123!)")
        else:
            print(f"  [ERRO]   {email}")

print(f"  Mapeados: {len(id_map)}/{len(prod_users)} utilizadores")

# ── 2. Apagar dados dev (ordem inversa de FK) ─────────────────────────────────
print("\n=== LIMPAR DEV ===")
for t in ["game_events", "games", "players", "escaloes", "event_types",
          "modalities", "profiles", "clubs"]:
    dev_delete(t)
    print(f"  {t} limpo")

# ── 3. Copiar dados prod -> dev ───────────────────────────────────────────────
print("\n=== COPIAR DADOS ===")

def copy(table, transform=None):
    rows = prod_get(f"/rest/v1/{table}?select=*")
    if transform:
        rows = [transform(r) for r in rows if transform(r) is not None]
    n = dev_insert(table, rows)
    print(f"  {table}: {n} linha(s)")

copy("clubs")
copy("modalities")
copy("event_types")

# profiles: mapear IDs de auth
def map_profile(p):
    new_id = id_map.get(p["id"])
    if not new_id:
        print(f"    AVISO: sem mapeamento para perfil {p.get('email')} — ignorado")
        return None
    return {**p, "id": new_id}

rows = prod_get("/rest/v1/profiles?select=*")
mapped = [map_profile(r) for r in rows]
mapped = [r for r in mapped if r]
dev_insert("profiles", mapped)
print(f"  profiles: {len(mapped)} linha(s)")

copy("escaloes")
copy("players")
copy("games")
copy("game_events")

print("\n=== CONCLUÍDO ===")
print("Todos os dados de produção foram copiados para dev.")
print("Utilizadores criados em dev têm password: DevTemp123!")
print(f"O teu utilizador (pncardoso@gmail.com) mantém a password que já definiste.")
