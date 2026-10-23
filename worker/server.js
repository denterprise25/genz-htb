const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
export default {async fetch(request,env){const url=new URL(request.url),path=url.pathname;const security={'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'same-origin'};
if(path==='/')return new Response(PAGE,{headers:security});
if(!path.startsWith('/api/'))return new Response('Not found',{status:404});
if(!env.BUCKET)return json({error:'Online storage is unavailable. Please try again later.'},503);
// This Site is owner-private; the Sites gateway enforces authentication on every request.
if(['POST','DELETE'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Invalid request origin'},403);
try{
if(path==='/api/walkthroughs'&&request.method==='GET'){let cursor,all=[];do{const page=await env.BUCKET.list({prefix:'records/',cursor});all.push(...page.objects);cursor=page.truncated?page.cursor:undefined}while(cursor);const records=await Promise.all(all.map(async x=>{const o=await env.BUCKET.get(x.key);return o?o.json():null}));return json(records.filter(Boolean))}
if(path==='/api/walkthroughs'&&request.method==='POST'){
if(Number(request.headers.get('content-length'))>11534336)return json({error:'Upload exceeds the 10 MB limit'},413);
const f=await request.formData(),get=k=>String(f.get(k)||'').trim(),id=get('id')||crypto.randomUUID();if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'Invalid walkthrough'},400);
const oldObject=await env.BUCKET.get('records/'+id),old=oldObject?await oldObject.json():{};
const r={id,title:get('title'),platform:get('platform'),os:get('os'),difficulty:get('difficulty'),summary:get('summary'),tags:get('tags'),status:get('status'),content:get('content'),updated:new Date().toISOString(),fileName:old.fileName||''};
if(!r.title||r.title.length>100||r.summary.length>300||r.tags.length>250||r.content.length>2000000)return json({error:'Add a machine name (max 100 characters) and keep content under 2 MB.'},400);
if(!['Linux','Windows','Other'].includes(r.os)||!['Easy','Medium','Hard','Insane'].includes(r.difficulty)||!['Draft','Published'].includes(r.status)||!['Hack The Box','TryHackMe','VulnHub','Other'].includes(r.platform))return json({error:'Invalid machine details'},400);
const file=f.get('file');if(file&&typeof file!=='string'&&file.size){if(file.size>10485760||! /\.(md|markdown|txt|pdf)$/i.test(file.name))return json({error:'Upload a Markdown, TXT, or PDF file under 10 MB.'},400);r.fileName=file.name.slice(0,200);await env.BUCKET.put('files/'+id,file.stream(),{httpMetadata:{contentType:'application/octet-stream'}})}
if(!r.content&&!r.fileName)return json({error:'Write a walkthrough or attach a file before saving.'},400);
await env.BUCKET.put('records/'+id,JSON.stringify(r),{httpMetadata:{contentType:'application/json'}});return json(r,201)}
const m=path.match(/^\/api\/(walkthroughs|files)\/([a-f0-9-]{36})$/);if(m){const [,kind,id]=m;if(kind==='walkthroughs'&&request.method==='DELETE'){await env.BUCKET.delete(['records/'+id,'files/'+id]);return json({ok:true})}if(kind==='files'&&request.method==='GET'){const o=await env.BUCKET.get('files/'+id),meta=await env.BUCKET.get('records/'+id);if(!o||!meta)return json({error:'File not found'},404);const r=await meta.json();return new Response(o.body,{headers:{'content-type':'application/octet-stream','content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(r.fileName),'x-content-type-options':'nosniff','cache-control':'private, no-store'}})}}return json({error:'Not found'},404);
}catch{return json({error:'Could not complete this request. Please try again.'},500)}}};
