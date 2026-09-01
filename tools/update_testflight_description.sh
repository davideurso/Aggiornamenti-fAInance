#!/usr/bin/env bash
set -euo pipefail

: "${APP_STORE_CONNECT_ISSUER_ID:?APP_STORE_CONNECT_ISSUER_ID missing}"
: "${APP_STORE_CONNECT_KEY_IDENTIFIER:?APP_STORE_CONNECT_KEY_IDENTIFIER missing}"
: "${APP_STORE_CONNECT_PRIVATE_KEY:?APP_STORE_CONNECT_PRIVATE_KEY missing}"
: "${BUNDLE_ID:=it.fainanceapp.app}"

DESC_FILE="${CM_BUILD_DIR:-$(pwd)}/app_store_beta_description.txt"
if [ ! -f "$DESC_FILE" ]; then
  DESC_FILE="app_store_beta_description.txt"
fi
[ -f "$DESC_FILE" ] || { echo "Missing app_store_beta_description.txt"; exit 2; }

python3 -m pip install --quiet --disable-pip-version-check pyjwt cryptography requests

python3 - "$DESC_FILE" <<'PY'
import base64
import json
import os
import re
import sys
import textwrap
import time
from pathlib import Path

import jwt
import requests
from cryptography.hazmat.primitives import serialization


def strip_outer_quotes(value: str) -> str:
    value = value.strip().lstrip("\ufeff")
    for _ in range(3):
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1].strip()
        else:
            break
    return value


def read_reference(value: str) -> tuple[str, str]:
    value = strip_outer_quotes(value)
    if value.startswith('@env:'):
        name = value[5:].strip()
        nested = os.environ.get(name, '')
        if not nested:
            raise ValueError(f'Environment reference {name} is empty')
        return nested, f'env:{name}'
    if value.startswith('@file:'):
        path = Path(strip_outer_quotes(value[6:])).expanduser()
        if not path.is_file():
            raise ValueError(f'Private-key file reference does not exist: {path}')
        return path.read_text(encoding='utf-8'), f'file:{path}'
    if value.startswith('file://'):
        path = Path(strip_outer_quotes(value[7:])).expanduser()
        if not path.is_file():
            raise ValueError(f'Private-key file URL does not exist: {path}')
        return path.read_text(encoding='utf-8'), f'file:{path}'
    looks_like_path = (
        value.startswith(('/', '~/', './', '../'))
        or re.match(r'^[A-Za-z]:[\\/]', value) is not None
        or ('/' in value and len(value) < 512)
        or ('\\' in value and len(value) < 512)
    )
    if looks_like_path:
        path = Path(value).expanduser()
        if path.is_file():
            return path.read_text(encoding='utf-8'), f'file:{path}'
    return value, 'environment'


def extract_json_candidate(value: str) -> str:
    text = value.strip()
    if not text:
        return text
    if text[0] not in '{["':
        return text
    try:
        obj = json.loads(text)
    except Exception:
        return text
    if isinstance(obj, str):
        return obj
    if isinstance(obj, dict):
        for key in ('private_key', 'privateKey', 'api_key', 'apiKey', 'key'):
            candidate = obj.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate
    return text


def rebuild_pem(value: str) -> str | None:
    text = strip_outer_quotes(value)
    text = text.replace('\\r\\n', '\n').replace('\\n', '\n').replace('\\r', '\n')
    text = text.replace('\r\n', '\n').replace('\r', '\n').strip()
    text = strip_outer_quotes(text)
    begin = '-----BEGIN PRIVATE KEY-----'
    end = '-----END PRIVATE KEY-----'
    if begin not in text or end not in text:
        return None
    body = text.split(begin, 1)[1].split(end, 1)[0]
    body = ''.join(re.findall(r'[A-Za-z0-9+/=]+', body))
    if not body:
        return None
    return begin + '\n' + '\n'.join(textwrap.wrap(body, 64)) + '\n' + end + '\n'


def try_base64(value: str) -> bytes | None:
    compact = ''.join(value.split())
    if not compact or len(compact) < 80:
        return None
    compact += '=' * (-len(compact) % 4)
    for decoder in (base64.b64decode, base64.urlsafe_b64decode):
        try:
            data = decoder(compact.encode('ascii'))
            if data:
                return data
        except Exception:
            pass
    return None


def serialize_key(key) -> str:
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode('ascii')


def validate_pem(pem: str) -> str:
    key = serialization.load_pem_private_key(pem.encode('utf-8'), password=None)
    return serialize_key(key)


def normalize_private_key(raw: str, key_id: str) -> tuple[str, str]:
    candidates: list[tuple[str, str]] = []
    try:
        dereferenced, source = read_reference(raw)
        candidates.append((dereferenced, source))
    except Exception as exc:
        candidates.append((raw, f'environment (reference warning: {exc})'))

    key_name = f'AuthKey_{key_id}.p8'
    home = Path.home()
    for path in (
        Path('private_keys') / key_name,
        home / 'private_keys' / key_name,
        home / '.private_keys' / key_name,
        home / '.appstoreconnect' / 'private_keys' / key_name,
    ):
        if path.is_file():
            try:
                candidates.append((path.read_text(encoding='utf-8'), f'file:{path}'))
            except Exception:
                pass

    errors: list[str] = []
    seen: set[str] = set()
    for raw_candidate, source in candidates:
        candidate = extract_json_candidate(raw_candidate)
        candidate = strip_outer_quotes(candidate)
        signature = source + ':' + str(len(candidate))
        if signature in seen:
            continue
        seen.add(signature)

        pem = rebuild_pem(candidate)
        if pem:
            try:
                return validate_pem(pem), source + '/pem'
            except Exception as exc:
                errors.append(f'{source}/pem: {type(exc).__name__}')

        decoded = try_base64(candidate)
        if decoded:
            try:
                decoded_text = decoded.decode('utf-8')
            except UnicodeDecodeError:
                decoded_text = ''
            if decoded_text:
                decoded_pem = rebuild_pem(decoded_text)
                if decoded_pem:
                    try:
                        return validate_pem(decoded_pem), source + '/base64-pem'
                    except Exception as exc:
                        errors.append(f'{source}/base64-pem: {type(exc).__name__}')
            try:
                key = serialization.load_der_private_key(decoded, password=None)
                return serialize_key(key), source + '/base64-der'
            except Exception as exc:
                errors.append(f'{source}/base64-der: {type(exc).__name__}')

    detail = ', '.join(errors[-8:]) if errors else 'no usable private-key candidate found'
    raise RuntimeError(
        'Unable to normalize App Store Connect private key. '
        'The Codemagic integration credentials are present, but the key is not raw PEM. '
        f'Tried raw PEM, @file/@env references, Codemagic key-file locations and base64. Details: {detail}'
    )


desc_path = sys.argv[1]
description = Path(desc_path).read_text(encoding='utf-8').strip()
if not description or 'Test generale' in description:
    raise SystemExit('Invalid TestFlight description payload')

issuer = os.environ['APP_STORE_CONNECT_ISSUER_ID'].strip()
key_id = os.environ['APP_STORE_CONNECT_KEY_IDENTIFIER'].strip()
bundle = os.environ.get('BUNDLE_ID', 'it.fainanceapp.app').strip()
private_key, key_source = normalize_private_key(os.environ['APP_STORE_CONNECT_PRIVATE_KEY'], key_id)
print(f'App Store Connect private key normalized safely from {key_source}; secret value not printed.')

now = int(time.time())
token = jwt.encode(
    {'iss': issuer, 'iat': now - 20, 'exp': now + 900, 'aud': 'appstoreconnect-v1'},
    private_key,
    algorithm='ES256',
    headers={'kid': key_id, 'typ': 'JWT'},
)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
base = 'https://api.appstoreconnect.apple.com/v1'


def req(method, url, **kwargs):
    response = requests.request(method, url, headers=headers, timeout=45, **kwargs)
    if response.status_code >= 400:
        raise SystemExit(
            f'App Store Connect API {method} {url} -> {response.status_code}: '
            f'{response.text[:1200]}'
        )
    return response


apps = req('GET', f'{base}/apps', params={'filter[bundleId]': bundle, 'limit': '5'}).json().get('data', [])
if len(apps) != 1:
    raise SystemExit(f'Expected exactly one App Store app for {bundle}, found {len(apps)}')
app_id = apps[0]['id']
locs = req('GET', f'{base}/apps/{app_id}/betaAppLocalizations', params={'limit': '200'}).json().get('data', [])

if not locs:
    payload = {
        'data': {
            'type': 'betaAppLocalizations',
            'attributes': {'locale': 'it', 'description': description},
            'relationships': {'app': {'data': {'type': 'apps', 'id': app_id}}},
        }
    }
    req('POST', f'{base}/betaAppLocalizations', data=json.dumps(payload, ensure_ascii=False).encode('utf-8'))
    print('Created TestFlight beta app localization: it')
else:
    for item in locs:
        loc_id = item['id']
        locale = item.get('attributes', {}).get('locale', 'unknown')
        payload = {
            'data': {
                'type': 'betaAppLocalizations',
                'id': loc_id,
                'attributes': {'description': description},
            }
        }
        req('PATCH', f'{base}/betaAppLocalizations/{loc_id}', data=json.dumps(payload, ensure_ascii=False).encode('utf-8'))
        print(f'Updated TestFlight beta app localization: {locale}')

verify = req('GET', f'{base}/apps/{app_id}/betaAppLocalizations', params={'limit': '200'}).json().get('data', [])
if not verify:
    raise SystemExit('No beta app localization found after update')
for item in verify:
    txt = (item.get('attributes', {}).get('description') or '').strip()
    if 'Test generale' in txt or txt != description:
        locale = item.get('attributes', {}).get('locale', 'unknown')
        raise SystemExit(f'TestFlight beta app description verification failed for locale {locale}')
print('TESTFLIGHT_DESCRIPTION_VERIFIED')
PY
