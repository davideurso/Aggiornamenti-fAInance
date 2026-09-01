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
import json, os, sys, time
import jwt, requests

desc_path=sys.argv[1]
description=open(desc_path,'r',encoding='utf-8').read().strip()
if not description or 'Test generale' in description:
    raise SystemExit('Invalid TestFlight description payload')

issuer=os.environ['APP_STORE_CONNECT_ISSUER_ID'].strip()
key_id=os.environ['APP_STORE_CONNECT_KEY_IDENTIFIER'].strip()
private_key=os.environ['APP_STORE_CONNECT_PRIVATE_KEY'].replace('\\n','\n').strip()
bundle=os.environ.get('BUNDLE_ID','it.fainanceapp.app').strip()
now=int(time.time())
token=jwt.encode({'iss':issuer,'iat':now-20,'exp':now+900,'aud':'appstoreconnect-v1'}, private_key, algorithm='ES256', headers={'kid':key_id,'typ':'JWT'})
headers={'Authorization':f'Bearer {token}','Content-Type':'application/json'}
base='https://api.appstoreconnect.apple.com/v1'

def req(method,url,**kwargs):
    r=requests.request(method,url,headers=headers,timeout=45,**kwargs)
    if r.status_code >= 400:
        raise SystemExit(f'App Store Connect API {method} {url} -> {r.status_code}: {r.text[:1200]}')
    return r

apps=req('GET',f'{base}/apps',params={'filter[bundleId]':bundle,'limit':'5'}).json().get('data',[])
if len(apps)!=1:
    raise SystemExit(f'Expected exactly one App Store app for {bundle}, found {len(apps)}')
app_id=apps[0]['id']
locs=req('GET',f'{base}/apps/{app_id}/betaAppLocalizations',params={'limit':'200'}).json().get('data',[])

if not locs:
    payload={'data':{'type':'betaAppLocalizations','attributes':{'locale':'it-IT','description':description},'relationships':{'app':{'data':{'type':'apps','id':app_id}}}}}
    req('POST',f'{base}/betaAppLocalizations',data=json.dumps(payload,ensure_ascii=False).encode('utf-8'))
    print('Created TestFlight beta app localization: it-IT')
else:
    for item in locs:
        loc_id=item['id']
        locale=item.get('attributes',{}).get('locale','unknown')
        payload={'data':{'type':'betaAppLocalizations','id':loc_id,'attributes':{'description':description}}}
        req('PATCH',f'{base}/betaAppLocalizations/{loc_id}',data=json.dumps(payload,ensure_ascii=False).encode('utf-8'))
        print(f'Updated TestFlight beta app localization: {locale}')

verify=req('GET',f'{base}/apps/{app_id}/betaAppLocalizations',params={'limit':'200'}).json().get('data',[])
if not verify:
    raise SystemExit('No beta app localization found after update')
for item in verify:
    txt=(item.get('attributes',{}).get('description') or '').strip()
    if 'Test generale' in txt or not txt.startswith('fAInance'):
        raise SystemExit('TestFlight beta app description verification failed')
print('TESTFLIGHT_DESCRIPTION_VERIFIED')
PY
