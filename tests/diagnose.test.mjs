import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {handleDiagnosis, workshopKey} from '../supabase/functions/writing-diagnose/handler.mjs';

const origin = 'https://qaz0926-afk.github.io';
const key = 'test-gemini-secret';
const env = name => name === 'GEMINI_API_KEY' ? key : undefined;
const options = {getEnv:env,fetcher:()=>{throw new Error('unexpected upstream call');}};
function req(body={contentText:'這是學生作品。'}, headers={}, method='POST') {
 return new Request('https://example.supabase.co/functions/v1/writing-diagnose', {
 method,headers:{origin,apikey:workshopKey,'content-type':'application/json',...headers},
 ...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})
 });
}
test('CORS preflight permits only workshop origin',async()=>{
 const ok=await handleDiagnosis(req(null,{},'OPTIONS'),options);
 assert.equal(ok.status,204);
 assert.equal(ok.headers.get('access-control-allow-origin'),origin);
 const bad=await handleDiagnosis(req(null,{origin:'https://other.example'},'OPTIONS'),options);
 assert.equal(bad.status,403); assert.equal(bad.headers.get('access-control-allow-origin'),null);
});
test('method, public app key, JSON and input limits validated before Gemini',async()=>{
 for(const [request,status] of [
 [req(null,{},'GET'),405],
 [req({}, {apikey:'wrong'}),401],
 [req({}, {'content-type':'text/plain'}),415],
 [req('{'),400],
 [req({contentText:''}),400],
 [req({contentText:'字'.repeat(6001)}),400],
 [req({contentText:'a'.repeat(33000)}),413],
 [req({contentText:'作品'}, {'content-length':'40000'}),413],
 ]) assert.equal((await handleDiagnosis(request,options)).status,status);
});
test('missing secret and invalid model fail without contacting Gemini',async()=>{
 assert.equal((await handleDiagnosis(req(),{...options,getEnv:()=>undefined})).status,503);
 assert.equal((await handleDiagnosis(req(),{...options,getEnv:n=>n==='GEMINI_API_KEY'?key:'bad/model'})).status,503);
});
test('Gemini receives fixed instructions and secret header; browser gets only visible feedback',async()=>{
 let called=false;
 const res=await handleDiagnosis(req(),{getEnv:env,fetcher:async(url,init)=>{
 called=true;
 assert.ok(!url.includes(key));
 assert.equal(init.headers['x-goog-api-key'],key);
 const body=JSON.parse(init.body);
 assert.ok(body.systemInstruction.parts[0].text.includes('國小高年級'));
 assert.ok(body.contents[0].parts[0].text.endsWith('這是學生作品。'));
 return Response.json({candidates:[{content:{parts:[{thought:true,text:'internal'},{text:'回饋一'},{text:'回饋二'}]}}],secret:key});
 }});
 assert.ok(called); assert.equal(res.status,200);
 const json=await res.json();
 assert.equal(json.candidates[0].content.parts[0].text,'回饋一回饋二');
 assert.ok(!JSON.stringify(json).includes(key));
 assert.equal(res.headers.get('access-control-allow-origin'),origin);
});
test('upstream failures do not expose secrets or bypass CORS',async()=>{
 for(const [fetcher,status] of [
 [async()=>new Response(key,{status:429}),429],
 [async()=>new Response(key,{status:403}),502],
 [async()=>{throw new Error(key);},502],
 [async()=>Response.json({candidates:[]}),502],
 ]) {
 const res=await handleDiagnosis(req(),{getEnv:env,fetcher});
 assert.equal(res.status,status); assert.ok(!(await res.text()).includes(key));
 assert.equal(res.headers.get('access-control-allow-origin'),origin);
 }
});
test('both pages use Supabase AI and retain Realtime without Gemini credentials',async()=>{
 for(const page of ['index.html','writing.html']) {
 const html=await readFile(new URL('../'+page,import.meta.url),'utf8');
 assert.ok(html.includes('/functions/v1/writing-diagnose'));
 assert.ok(html.includes("'apikey': SUPABASE_KEY"));
 assert.ok(html.includes("supabaseClient.channel("));
 assert.ok(html.includes("event: 'sync-input'"));
 assert.ok(!html.includes("const apiUrl = '/api/diagnose'"));
 assert.ok(!html.includes('generativelanguage.googleapis.com'));
 assert.ok(!html.includes('apiKey'));
 assert.ok(html.includes('sanitizeFeedback(formatMarkdownToHtml(aiText))'));
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
 if(!/\bsrc\s*=/.test(match[1]) && !/type=["'](?:application\/|module)/.test(match[1])) new vm.Script(match[2]);
 }
 }
});
