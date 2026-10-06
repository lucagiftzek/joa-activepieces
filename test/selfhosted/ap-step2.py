import json, os, urllib.request
B='http://127.0.0.1:18080/api/v1'
st=json.load(open(os.path.expanduser('~/joa-integrations/_aptest/state.json')))
tok, pid = st['token'], st['projectId']
KEY=os.environ['JOA_API_KEY']
PIECE='@jobopportunitiesapi/piece-job-opportunities-api'
def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B+path, data=data, method=method, headers={'content-type':'application/json','authorization':'Bearer '+tok})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp: return resp.status, json.loads(resp.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:700]
def scrub(x): return str(x).replace(KEY, '***')
# 1. connections (validate() runs inside Activepieces)
s,b=req('POST','/app-connections',{'externalId':'joa-bad','displayName':'JOA bad key','pieceName':PIECE,'projectId':pid,'type':'SECRET_TEXT','value':{'type':'SECRET_TEXT','secret_text':'joa_invalid_key_for_test'}})
print('1a bad-key connection ->', s, scrub(b)[:400])
s,b=req('POST','/app-connections',{'externalId':'joa-test','displayName':'JOA test key','pieceName':PIECE,'projectId':pid,'type':'SECRET_TEXT','value':{'type':'SECRET_TEXT','secret_text':KEY}})
print('1b good connection ->', s, (b.get('status') if isinstance(b,dict) else scrub(b)[:400]))
# 2. flow
s,flow=req('POST','/flows',{'displayName':'JOA local test','projectId':pid})
print('2 flow ->', s); fid=flow['id']; fvid=flow['version']['id']
auth="{{connections['joa-test']}}"
s,b=req('POST',f'/flows/{fid}',{'type':'UPDATE_TRIGGER','request':{'name':'trigger','type':'PIECE_TRIGGER','valid':True,'displayName':'New Job',
   'settings':{'pieceName':PIECE,'pieceVersion':'0.1.1','triggerName':'new_job','input':{'auth':auth,'country':'GB','lookbackHours':24,'maxJobs':5},'propertySettings':{}}}})
print('3 update trigger ->', s, '' if s<300 else scrub(b))
s,b=req('POST','/test-trigger',{'projectId':pid,'flowId':fid,'flowVersionId':fvid,'testStrategy':'TEST_FUNCTION'})
items = b if isinstance(b,list) else (b.get('data') if isinstance(b,dict) else None)
print('4 test trigger ->', s, (f'{len(items)} sample(s); first: '+json.dumps({k:items[0].get(k) for k in ('title','company','country','apply_url')})) if items else scrub(b)[:600])
s,b=req('POST',f'/flows/{fid}',{'type':'ADD_ACTION','request':{'parentStep':'trigger','action':{'name':'step_1','type':'PIECE','valid':True,'displayName':'Search Jobs',
   'settings':{'pieceName':PIECE,'pieceVersion':'0.1.1','actionName':'search_jobs','input':{'auth':auth,'country':'DE','remote':['remote'],'maxResults':3},'propertySettings':{}}}}})
print('5 add search_jobs ->', s, '' if s<300 else scrub(b))
s,b=req('POST',f'/flows/{fid}',{'type':'ADD_ACTION','request':{'parentStep':'step_1','action':{'name':'step_2','type':'PIECE','valid':True,'displayName':'Get Job',
   'settings':{'pieceName':PIECE,'pieceVersion':'0.1.1','actionName':'get_job','input':{'auth':auth,'job':'{{trigger.slug}}'},'propertySettings':{}}}}})
print('6 add get_job ->', s, '' if s<300 else scrub(b))
for step in ('step_1','step_2'):
    s,b=req('POST','/sample-data/test-step',{'projectId':pid,'flowVersionId':fvid,'stepName':step})
    if isinstance(b,dict):
        out=b.get('output')
        summary = (f'{len(out)} jobs, remote={sorted(set(j.get("remote") for j in out))}' if isinstance(out,list) else
                   (json.dumps({'id':out.get('data',{}).get('id'),'title':out.get('data',{}).get('title'),'has_description':bool(out.get('description'))}) if isinstance(out,dict) else scrub(out)[:300]))
        print(f'7 test {step} ->', s, 'success=',b.get('success'), summary, scrub(b.get('standardError',''))[:300])
    else: print(f'7 test {step} ->', s, scrub(b))
json.dump({**st,'flowId':fid}, open(os.path.expanduser('~/joa-integrations/_aptest/state.json'),'w'))
