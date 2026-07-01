#!/usr/bin/env bash
# Idempotent: set 1 GB upload limit on main + API nginx server blocks.
# Run on VPS after git pull: sudo bash deploy/apply-nginx-upload-limits.sh
set -euo pipefail

NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/sharifcommerceacademy}"
BODY_LIMIT="${BODY_LIMIT:-1024m}"
PROXY_TIMEOUT="${PROXY_TIMEOUT:-3600s}"

if [[ ! -f "$NGINX_SITE" ]]; then
  echo "nginx site not found: $NGINX_SITE" >&2
  exit 1
fi

python3 << PY
import re
from pathlib import Path

path = Path("$NGINX_SITE")
content = path.read_text()
changed = False
body_limit = "$BODY_LIMIT"
proxy_timeout = "$PROXY_TIMEOUT"

def patch_server_block(marker: str, extra_lines: list[str]) -> None:
    global content, changed
    idx = content.find(marker)
    if idx == -1:
        raise SystemExit(f"server block not found: {marker!r}")

    next_server = content.find("\nserver {", idx + 1)
    block_end = next_server if next_server != -1 else len(content)
    block = content[idx:block_end]

    # Normalize body size and proxy timeout in this block
    new_block, n1 = re.subn(
        r"^\s*client_max_body_size\s+[^;]+;\s*\n",
        f"    client_max_body_size {body_limit};\n",
        block,
        count=1,
        flags=re.M,
    )
    new_block, n2 = re.subn(
        r"^\s*proxy_read_timeout\s+[^;]+;\s*\n",
        f"    proxy_read_timeout {proxy_timeout};\n",
        new_block,
        count=1,
        flags=re.M,
    )
    if n1 or n2:
        content = content[:idx] + new_block + content[block_end:]
        changed = True
        next_server = content.find("\nserver {", idx + 1)
        block_end = next_server if next_server != -1 else len(content)
        block = content[idx:block_end]

    for line in extra_lines:
        if line in block:
            continue
        insert_at = content.find("\n", idx) + 1
        content = content[:insert_at] + "\n" + line + "\n" + content[insert_at:]
        changed = True
        next_server = content.find("\nserver {", idx + 1)
        block_end = next_server if next_server != -1 else len(content)
        block = content[idx:block_end]

patch_server_block(
    "server_name sharifcommerceacademy.com www.sharifcommerceacademy.com;",
    [
        f"    client_max_body_size {body_limit};",
        f"    proxy_read_timeout {proxy_timeout};",
    ],
)

api_marker = "server_name api.sharifcommerceacademy.com;"
idx = content.find(api_marker)
if idx == -1:
    raise SystemExit("api server block not found")
next_server = content.find("\nserver {", idx + 1)
block_end = next_server if next_server != -1 else len(content)
api_block = content[idx:block_end]

if not re.search(r"client_max_body_size\s+", api_block):
    insert_at = content.find("\n", idx) + 1
    content = content[:insert_at] + f"\n    client_max_body_size {body_limit};\n" + content[insert_at:]
    changed = True
    next_server = content.find("\nserver {", idx + 1)
    block_end = next_server if next_server != -1 else len(content)
    api_block = content[idx:block_end]
else:
    new_api, n = re.subn(
        r"^\s*client_max_body_size\s+[^;]+;\s*\n",
        f"    client_max_body_size {body_limit};\n",
        api_block,
        count=1,
        flags=re.M,
    )
    if n:
        content = content[:idx] + new_api + content[block_end:]
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
echo "nginx reloaded OK (body limit: $BODY_LIMIT)"
