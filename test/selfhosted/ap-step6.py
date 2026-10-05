import json, os, urllib.request, time
B='http://127.0.0.1:18080/api/v1'
st=json.load(open(os.path.expanduser('~/joa-integrations/_aptest/state.json')))
tok, pid, fid = st['token'], st['projectId'], st['flowId']
KEY=os.environ['JOA_API_KEY']
def req(method, path, body=None, base=B, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(base+path, data=data, method=method, headers=headers or {'content-type':'application/json','authorization':'Bearer '+tok})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:700]
s,j=req('GET','/v1/jobs?limit=1&country=FR',base='https://api.jobopportunitiesapi.org',headers={'authorization':'Bearer '+KEY,'user-agent':'joa-integrations-local-test/0.1'})
if s!=200: print('JOA lookup failed', s, str(j)[:200]); raise SystemExit(1)
slug=j['data'][0]['slug']
PIECE='@lucagiftzek/piece-job-opportunities-api'
s,b=req('POST',f'/flows/{fid}',{'type':'UPDATE_ACTION','request':{'name':'step_3','type':'PIECE','valid':True,'displayName':'Get Job',
   'settings':{'pieceName':PIECE,'pieceVersion':'0.1.0','actionName':'get_job','input':{'auth':"{{connections['joa-test']}}",'job':slug},'propertySettings':{}}}})
print('update step_3 ->', s)
s,flow=req('GET',f'/flows/{fid}'); fvid=flow['version']['id']
s,run=req('POST','/sample-data/test-step',{'projectId':pid,'flowVersionId':fvid,'stepName':'step_3'})
for i in range(40):
    time.sleep(2); s,r=req('GET',f'/flow-runs/{run["id"]}')
    if r.get('status') not in ('QUEUED','RUNNING'): break
st3=(r.get('steps') or {}).get('step_3') or {}
print('step_3 run:', r.get('status'), '| step:', st3.get('status'), '| error:', (st3.get('errorMessage') or '')[:200].replace(KEY,'***'))
# The flow run's step outputs are stored in a logs file; the run status is the evidence here.
