import json, os, urllib.request
B='http://127.0.0.1:18080/api/v1'
st=json.load(open(os.path.expanduser('~/joa-integrations/_aptest/state.json')))
tok, pid, fid = st['token'], st['projectId'], st['flowId']
def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B+path, data=data, method=method, headers={'content-type':'application/json','authorization':'Bearer '+tok})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]
PIECE='@lucagiftzek/piece-job-opportunities-api'
for trig, inp in (('job_closed',{'maxClosures':100}),('job_changed',{'maxChanges':50})):
    s,b=req('POST',f'/flows/{fid}',{'type':'UPDATE_TRIGGER','request':{'name':'trigger','type':'PIECE_TRIGGER','valid':True,'displayName':trig,
       'settings':{'pieceName':PIECE,'pieceVersion':'0.1.0','triggerName':trig,'input':{'auth':"{{connections['joa-test']}}",**inp},'propertySettings':{}}}})
    s,flow=req('GET',f'/flows/{fid}'); fvid=flow['version']['id']
    s,b=req('POST','/test-trigger',{'projectId':pid,'flowId':fid,'flowVersionId':fvid,'testStrategy':'TEST_FUNCTION'})
    data=b.get('data') if isinstance(b,dict) else None
    first=(data[0].get('payload') if data else None) or {}
    keys=sorted(first.keys()) if isinstance(first,dict) else first
    print(trig,'test ->',s, f'{len(data)} sample(s), payload keys {keys}' if data is not None else str(b)[:300])
