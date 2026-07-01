#!/usr/bin/env bash
# Idempotent: add 50 MB upload limit to main + API nginx server blocks.
# Run on VPS after git pull: sudo bash deploy/apply-nginx-upload-limits.sh
set -euo pipefail

NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/sharifcommerceacademy}"

if [[ ! -f "$NGINX_SITE" ]]; then
  echo "nginx site not found: $NGINX_SITE" >&2
  exit 1
fi

python3 << PY
from pathlib import Path

path = Path("$NGINX_SITE")
content = path.read_text()
changed = False

def ensure_after_server_name(block_marker: str, insert_lines: list[str]) -> None:
    global content, changed
    idx = content.find(block_marker)
    if idx == -1:
        raise SystemExit(f"server block not found: {block_marker!r}")

    # Only patch this server { } block (until next "server {" or EOF)
    next_server = content.find("\nserver {", idx + 1)
    block_end = next_server if next_server != -1 else len(content)
    block = content[idx:block_end]

    for line in insert_lines:
        if line in block:
            continue
        loc = content.find(block_marker)
        loc_end = block_end
        insert_at = content.find("\n", loc) + 1
        snippet = "\n" + line + "\n"
        content = content[:insert_at] + snippet + content[insert_at:]
        changed = True
        # Recalculate block bounds after mutation
        next_server = content.find("\nserver {", idx + 1)
        block_end = next_server if next_server != -1 else len(content)
        block = content[idx:block_end]

# Main site — uploads go through Next.js /api proxy
ensure_after_server_name(
    "server_name sharifcommerceacademy.com www.sharifcommerceacademy.com;",
    [
        "    client_max_body_size 50m;",
        "    proxy_read_timeout 300s;",
    ],
)

# API site — direct API + static /uploads/
api_marker = "server_name api.sharifcommerceacademy.com;"
idx = content.find(api_marker)
if idx == -1:
    raise SystemExit("api server block not found")
next_server = content.find("\nserver {", idx + 1)
block_end = next_server if next_server != -1 else len(content)
api_block = content[idx:block_end]

if "client_max_body_size 50m;" not in api_block:
    insert_at = content.find("\n", idx) + 1
    content = content[:insert_at] + "\n    client_max_body_size 50m;\n" + content[insert_at:]
    changed = True
    next_server = content.find("\nserver {", idx + 1)
    block_end = next_server if next_server != -1 else len(content)
    api_block = content[idx:block_end]

uploads_loc = """    location /uploads/ {
        alias /var/www/sca-lms/uploads/;
        add_header Cache-Control "public, max-age=604800";
        add_header Cross-Origin-Resource-Policy "cross-origin";
    }

"""
if "location /uploads/" not in api_block:
    loc = content.find("    location / {", idx)
    if loc == -1 or loc > block_end:
        raise SystemExit("api location / not found")
    content = content[:loc] + uploads_loc + content[loc:]
    changed = True

if changed:
    path.write_text(content)
    print("nginx site updated:", path)
else:
    print("nginx site already configured:", path)
PY

nginx -t
systemctl reload nginx
echo "nginx reloaded OK"
