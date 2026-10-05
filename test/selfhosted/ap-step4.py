import json, os, urllib.request, time
B='http://127.0.0.1:18080/api/v1'
st=json.load(open(os.path.expanduser('~/joa-integrations/_aptest/state.json')))
tok, pid, fid = st['token'], st['projectId'], st['flowId']
KEY=os.environ['JOA_API_KEY']
def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B+path, data=data, method=method, headers={'content-type':'application/json','authorization':'Bearer '+tok})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:700]
s,flow=req('GET',f'/flows/{fid}'); fvid=flow['version']['id']
for step in ('step_1','step_2'):
    s,run=req('POST','/sample-data/test-step',{'projectId':pid,'flowVersionId':fvid,'stepName':step})
    rid=run['id']
    for i in range(40):
        time.sleep(2)
        s,r=req('GET',f'/flow-runs/{rid}')
        if isinstance(r,dict) and r.get('status') not in ('QUEUED','RUNNING'): break
    st_=r.get('status') if isinstance(r,dict) else r
    steps=r.get('steps') or {}
    out=(steps.get(step) or {}).get('output')
    if isinstance(out,list): summ=f'{len(out)} jobs; remote={sorted(set(str(j.get("remote")) for j in out))}; countries={sorted(set(str(j.get("country")) for j in out))}'
    elif isinstance(out,dict): summ=json.dumps({'id':(out.get('data') or {}).get('id'),'title':(out.get('data') or {}).get('title'),'description_chars':len(out.get('description') or '')})
    else: summ=json.dumps(steps)[:600].replace(KEY,'***')
    print(step, 'run status:', st_, '|', summ, '| step status:', (steps.get(step) or {}).get('status'), '| logsFileId' , bool(r.get('logsFileId')) if isinstance(r,dict) else '')
