'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/diagnose');
const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;
after(() => { global.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });
function response() { return { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(v) { this.code=v; return this; }, json(v) { this.body=v; return this; } }; }
function request(body={contentText:'這是學生作品。'}) { return {method:'POST',headers:{host:'class.example',origin:'https://class.example','content-type':'application/json'},body}; }
test('reject invalid requests before calling Gemini', async () => {
 global.fetch = () => { throw new Error('must not call'); };
 for (const [req, code] of [[{...request(), method:'GET'},405],[{...request(),headers:{...request().headers,origin:'https://other.example'}},403],[request({contentText:''}),400],[request({contentText:'字'.repeat(6001)}),400],[{...request(),body:'{'},400],[{...request(),headers:{}},415]]) {
 const res=response(); await handler(req,res); assert.equal(res.code,code);
 }
});
test('missing key returns a safe configuration error', async () => {
 delete process.env.GEMINI_API_KEY; const res=response(); await handler(request(),res); assert.equal(res.code,503);
});
test('server forwards fixed instructions and key only in upstream header', async () => {
 process.env.GEMINI_API_KEY='test-secret';
 global.fetch=async (url,opts) => {
 assert.ok(!url.includes('test-secret'));
 assert.equal(opts.headers['x-goog-api-key'],'test-secret');
 const body=JSON.parse(opts.body); assert.ok(body.systemInstruction.parts[0].text.includes('國小高年級'));
 assert.equal(body.contents[0].parts[0].text.endsWith('這是學生作品。'),true);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{thought:true,text:'internal'},{text:'回饋一'},{text:'回饋二'}]}}],secret:'test-secret'})};
 };
 const res=response(); await handler(request(),res); assert.equal(res.code,200);
 assert.equal(res.body.candidates[0].content.parts[0].text,'回饋一回饋二');
 assert.ok(!JSON.stringify(res.body).includes('test-secret'));
});
test('upstream errors and network failures do not disclose secrets', async () => {
 process.env.GEMINI_API_KEY='test-secret';
 for (const [fetcher,code] of [[async()=>({ok:false,status:429}),429],[async()=>({ok:false,status:403}),502],[async()=>{throw new Error('test-secret');},502],[async()=>({ok:true,json:async()=>({candidates:[]})}),502]]) {
 global.fetch=fetcher; const res=response(); await handler(request(),res);
 assert.equal(res.code,code); assert.ok(!JSON.stringify(res.body).includes('test-secret'));
 }
});
test('both pages call backend without credentials and remain valid JavaScript', () => {
 const fs=require('node:fs'); const vm=require('node:vm');
 for (const name of ['index.html','writing.html']) {
 const html=fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8');
 assert.ok(html.includes("const apiUrl = '/api/diagnose'"));
 assert.ok(!html.includes('generativelanguage.googleapis.com'));
 assert.ok(!html.includes('apiKey'));
 assert.ok(html.includes('sanitizeFeedback(formatMarkdownToHtml(aiText))'));
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
 if(!/\bsrc\s*=/.test(match[1]) && !/type=["'](?:application\/|module)/.test(match[1])) new vm.Script(match[2]);
 }
 }
});
