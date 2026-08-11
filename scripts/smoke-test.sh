#!/usr/bin/env bash
#
# End-to-end check against a running deployment: registers a restaurant, fills
# it in, submits it, approves it as an admin, and confirms it appears publicly
# in all three languages. Also verifies that private venue photos stay private.
#
#   scripts/smoke-test.sh [BASE_URL] [ADMIN_USER] [ADMIN_PASSWORD]
#
# Defaults to http://localhost:4080. The admin password is required; on a fresh
# deployment it is printed once to the container log:
#   docker compose logs app | grep -A4 "FIRST RUN"
#
# Creates real data. Run it against a test deployment, not production.
set -euo pipefail

BASE="${1:-http://localhost:4080}"
ADMIN_USER="${2:-admin}"
ADMIN_PASS="${3:-}"

if [[ -z "$ADMIN_PASS" ]]; then
  echo "Usage: $0 [BASE_URL] [ADMIN_USER] ADMIN_PASSWORD" >&2
  exit 1
fi

OWNER_JAR="$(mktemp)"
ADMIN_JAR="$(mktemp)"
trap 'rm -f "$OWNER_JAR" "$ADMIN_JAR"' EXIT

# Unique per run so the script can be run repeatedly without collisions.
# Turkmen local numbers are eight digits, so the phone is 6 plus the last seven
# digits of the epoch.
EPOCH="$(date +%s)"
SUFFIX="${EPOCH: -7}"
OWNER_PHONE="6${SUFFIX}"
STORE_NAME="Smoke Test ${SUFFIX}"

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; exit 1; }

expect() {
  local label="$1" actual="$2" wanted="$3"
  if [[ "$actual" == "$wanted" ]]; then
    pass "$label ($actual)"
  else
    fail "$label: got '$actual', wanted '$wanted'"
  fi
}

# Posts a JSON body and echoes the status code. The body is passed as a single
# argument rather than interpolated inside a command substitution, where
# backslash-escaped quotes would be eaten by the outer quoting context.
post_json() {
  local method="$1" url="$2" body="$3" jar="${4:-}"
  if [[ -n "$jar" ]]; then
    curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" \
      -X "$method" "$url" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -o /dev/null -w '%{http_code}' \
      -X "$method" "$url" -H 'Content-Type: application/json' -d "$body"
  fi
}

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json() { python3 -c "import sys,json;$1"; }

echo "Smoke test against $BASE"
echo
echo "Infrastructure"
expect "health endpoint" "$(code "$BASE/api/health")" 200
expect "SPA is served" "$(code "$BASE/")" 200
expect "client-side route falls back to the SPA" "$(code "$BASE/admin/login")" 200
expect "map style" "$(code "$BASE/maps/style.json")" 200
expect "map tile over Ashgabat" "$(code "$BASE/maps/tiles/14/10846/6322.pbf")" 200
expect "map glyphs" "$(code "$BASE/maps/fonts/Noto%20Sans%20Regular/0-255.pbf")" 200
expect "tile database is not downloadable" "$(code "$BASE/maps/tiles.bin")" 404
expect "admin API rejects anonymous callers" "$(code "$BASE/api/admin/stats")" 401

echo
echo "Store owner journey"
REGISTER_BODY="$(python3 -c '
import json, sys
print(json.dumps({
  "owner": {"fullName": "Smoke Tester", "phone": sys.argv[1], "password": "SmokeTestPass1!"},
  "store": {"name": {"tk": sys.argv[2]}, "primaryLang": "tk", "phone": "12000000"},
}))' "$OWNER_PHONE" "$STORE_NAME")"
curl -s -c "$OWNER_JAR" -X POST "$BASE/api/store/register" \
  -H 'Content-Type: application/json' -d "$REGISTER_BODY" \
  > /tmp/smoke-register.json
SLUG="$(json "print(json.load(open('/tmp/smoke-register.json'))['store']['slug'])")"
STATUS="$(json "print(json.load(open('/tmp/smoke-register.json'))['store']['status'])")"
expect "registration creates a draft" "$STATUS" draft
pass "slug: $SLUG"

LISTING_BODY='{"description":{"tk":"Synag","en":"Smoke test venue","ru":"Тест"},"address":{"tk":"Synag köçesi 1"},"lat":37.95,"lng":58.38,"neighborhood":"Berkararlyk"}'
expect "listing details save" "$(post_json PATCH "$BASE/api/store/me" "$LISTING_BODY" "$OWNER_JAR")" 200

CATEGORY="$(curl -s "$BASE/api/public/categories?lang=en" | json "print(json.load(sys.stdin)['categories'][0]['id'])")"
CATEGORY_BODY="{\"categoryIds\":[\"$CATEGORY\"]}"
expect "categories save" "$(post_json PUT "$BASE/api/store/me/categories" "$CATEGORY_BODY" "$OWNER_JAR")" 200

HOURS_BODY='{"hours":[{"weekday":0,"opens":"00:00","closes":"23:59"},{"weekday":1,"opens":"00:00","closes":"23:59"},{"weekday":2,"opens":"00:00","closes":"23:59"},{"weekday":3,"opens":"00:00","closes":"23:59"},{"weekday":4,"opens":"00:00","closes":"23:59"},{"weekday":5,"opens":"00:00","closes":"23:59"},{"weekday":6,"opens":"00:00","closes":"23:59"}]}'
expect "opening hours save" "$(post_json PUT "$BASE/api/store/me/hours" "$HOURS_BODY" "$OWNER_JAR")" 200

# A tiny valid PNG, generated inline so the script needs no fixture files.
python3 - <<'PY'
import struct, zlib
def chunk(t, d):
    c = t + d
    return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
w = h = 400
raw = b"".join(b"\x00" + bytes([(x * 255) // w, 120, 180] * 1) * w for x in range(h))
png = (b"\x89PNG\r\n\x1a\n"
       + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(raw, 6))
       + chunk(b"IEND", b""))
open("/tmp/smoke-image.png", "wb").write(png)
PY

expect "cover photo uploads" "$(code -b "$OWNER_JAR" -X POST "$BASE/api/store/me/media" \
  -F kind=cover -F image=@/tmp/smoke-image.png)" 201
expect "venue photo 1 uploads" "$(code -b "$OWNER_JAR" -X POST "$BASE/api/store/me/media" \
  -F kind=venue_proof -F image=@/tmp/smoke-image.png)" 201
expect "venue photo 2 uploads" "$(code -b "$OWNER_JAR" -X POST "$BASE/api/store/me/media" \
  -F kind=venue_proof -F image=@/tmp/smoke-image.png)" 201

SECTION_BODY='{"name":{"tk":"Esasy","en":"Mains","ru":"Основные"}}'
SECTION="$(curl -s -b "$OWNER_JAR" -X POST "$BASE/api/store/me/menu/sections" \
  -H 'Content-Type: application/json' -d "$SECTION_BODY" \
  | json "print(json.load(sys.stdin)['section']['id'])")"
ITEM_BODY="{\"sectionId\":\"$SECTION\",\"name\":{\"tk\":\"Synag tagamy\",\"en\":\"Test dish\"},\"priceMinor\":4550}"
expect "menu item is created" "$(post_json POST "$BASE/api/store/me/menu/items" "$ITEM_BODY" "$OWNER_JAR")" 201

SUBMITTED="$(curl -s -b "$OWNER_JAR" -X POST "$BASE/api/store/me/submit" \
  | json "print(json.load(sys.stdin)['store']['status'])")"
expect "submitting moves it to review" "$SUBMITTED" pending

echo
echo "Not visible before approval"
FOUND="$(curl -s "$BASE/api/public/stores/$SLUG?lang=tk" -o /dev/null -w '%{http_code}')"
expect "public detail is 404 while pending" "$FOUND" 404

echo
echo "Admin moderation"
LOGIN_BODY="$(python3 -c 'import json,sys;print(json.dumps({"username":sys.argv[1],"password":sys.argv[2]}))' "$ADMIN_USER" "$ADMIN_PASS")"
expect "admin signs in" "$(post_json POST "$BASE/api/auth/admin/login" "$LOGIN_BODY" "$ADMIN_JAR")" 200

STORE_ID="$(curl -s -b "$ADMIN_JAR" "$BASE/api/admin/stores?status=pending&search=$SUFFIX" \
  | json "print(json.load(sys.stdin)['stores'][0]['id'])")"
pass "found in the review queue"

PROOF_COUNT="$(curl -s -b "$ADMIN_JAR" "$BASE/api/admin/stores/$STORE_ID" \
  | json "print(len([m for m in json.load(sys.stdin)['media'] if m['kind']=='venue_proof']))")"
expect "admin can see the venue photos" "$PROOF_COUNT" 2

PROOF_URL="$(curl -s -b "$ADMIN_JAR" "$BASE/api/admin/stores/$STORE_ID" \
  | json "print([m['url'] for m in json.load(sys.stdin)['media'] if m['kind']=='venue_proof'][0])")"
expect "venue photo is refused anonymously" "$(code "$BASE$PROOF_URL")" 403
expect "venue photo is served to the admin" "$(code -b "$ADMIN_JAR" "$BASE$PROOF_URL")" 200

APPROVED="$(curl -s -b "$ADMIN_JAR" -X POST "$BASE/api/admin/stores/$STORE_ID/approve" \
  | json "print(json.load(sys.stdin)['store']['status'])")"
expect "approval publishes it" "$APPROVED" approved

echo
echo "Public visibility"
for LANG in tk en ru; do
  NAME="$(curl -s "$BASE/api/public/stores/$SLUG?lang=$LANG" \
    | json "print(json.load(sys.stdin)['store']['description'])")"
  [[ -n "$NAME" ]] && pass "[$LANG] $NAME" || fail "[$LANG] description was empty"
done

COVER="$(curl -s "$BASE/api/public/stores/$SLUG?lang=tk" \
  | json "print(json.load(sys.stdin)['store']['cover']['url'])")"
expect "cover photo is publicly readable" "$(code "$BASE$COVER")" 200

PRICE="$(curl -s "$BASE/api/public/stores/$SLUG?lang=en" \
  | json "print(json.load(sys.stdin)['store']['menu'][0]['items'][0]['priceMinor'])")"
expect "menu price survives as integer tenge" "$PRICE" 4550

echo
echo "Cleanup"
expect "admin deletes the test store" "$(code -b "$ADMIN_JAR" -X DELETE "$BASE/api/admin/stores/$STORE_ID")" 200

echo
printf '\033[32mAll checks passed.\033[0m\n'
