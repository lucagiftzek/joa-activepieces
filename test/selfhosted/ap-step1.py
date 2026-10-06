import json, os, subprocess, urllib.request, secrets
B='http://127.0.0.1:18080/api/v1'
st_path=os.path.expanduser('~/joa-integrations/_aptest/state.json'); os.makedirs(os.path.dirname(st_path), exist_ok=True)
def req(method, path, body=None, token=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B+path, data=data, method=method, headers={'content-type':'application/json', **({'authorization':'Bearer '+token} if token else {})})
    try:
        with urllib.request.urlopen(r, timeout=60) as resp: return resp.status, json.loads(resp.read() or b'null')
    except urllib.error.HTTPError as e:
        t=e.read().decode()[:600]; return e.code, t
st = json.load(open(st_path)) if os.path.exists(st_path) else {}
if 'token' not in st:
    pw = secrets.token_urlsafe(18)
    s, b = req('POST','/authentication/sign-up', {'email':'local-test@joa-integrations.invalid','password':pw+'Aa1!','firstName':'Local','lastName':'Tester','trackEvents':False,'newsLetter':False})
    print('signup', s, (b if s>=300 else {k:b.get(k) for k in ('projectId','platformId','status')}))
    if s<300: st={'token':b['token'],'projectId':b['projectId'],'platformId':b.get('platformId')}; json.dump(st, open(st_path,'w')); os.chmod(st_path,0o600)
tok=st['token']
# install piece archive
tgz=os.path.expanduser('~/joa-integrations/activepieces/jobopportunitiesapi-piece-job-opportunities-api-0.1.1.tgz')
out = subprocess.run(['curl','-s','-w','\nHTTP %{http_code}','-X','POST',B+'/pieces','-H','authorization: Bearer '+tok,
  '--form-string','packageType=ARCHIVE','--form-string','pieceName=@jobopportunitiesapi/piece-job-opportunities-api','--form-string','pieceVersion=0.1.1','--form-string','scope=PLATFORM',
  '-F','pieceArchive=@'+tgz], capture_output=True, text=True)
print('install', out.stdout[-800:])
s,b = req('GET','/pieces/%40lucagiftzek%2Fpiece-job-opportunities-api', token=tok)
print('get piece', s, (json.dumps({k:b.get(k) for k in ('name','displayName','version','minimumSupportedRelease')}) if s<300 else b)[:600])
if s<300: print('actions', list(b.get('actions',{}).keys()), 'triggers', list(b.get('triggers',{}).keys()))
s,b = req('GET','/pieces?searchQuery=webhook', token=tok); print('webhook piece available:', s, [p.get('name') for p in b][:5] if s<300 else b)
