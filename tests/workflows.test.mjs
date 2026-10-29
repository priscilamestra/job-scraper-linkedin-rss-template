import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=fs.readdirSync(path.join(root,'Workflows')).filter(p=>p.endsWith('.json'));
const workflows=files.map(p=>JSON.parse(fs.readFileSync(path.join(root,'Workflows',p),'utf8')));
const byName=Object.fromEntries(workflows.map(w=>[w.name,w]));
const find=(part)=>workflows.find(w=>w.name.includes(part));
const node=(w,name)=>{const n=w.nodes.find(n=>n.name===name);assert.ok(n,`Missing node ${name}`);return n;};
const jobs=(rows)=>rows.map(json=>({json}));
let count=0;
function check(name,fn){fn();count++;console.log(`PASS ${name}`);}
function run(w,name,rows=[],refs={},clock) {
 const items=jobs(rows), n=node(w,name);
 const dollar=name=>{
  assert.ok(name in refs,`Fixture missing ${name}`);
  const r=jobs(Array.isArray(refs[name])?refs[name]:[refs[name]]);
  return {first:()=>r[0],item:r[0],all:()=>r};
 };
 const context={$json:rows[0]||{},$input:{all:()=>items,first:()=>items[0]},$:dollar,URL,console};
 if(clock){const stamp=Date.parse(clock);context.Date=class extends Date{constructor(...a){super(...(a.length?a:[stamp]));}static now(){return stamp;}};}
 return vm.runInNewContext(`(function(){${n.parameters.jsCode}\n})()`,context,{timeout:3000});
}
function expression(text,json={},refs={}) {
 const $=name=>({first:()=>({json:refs[name]}),item:{json:refs[name]}});
 return new Function('$json','$',`return (${text.slice(3,-2)});`)(json,$);
}
const scraper=find('01 '),saver=find('02 '),cover=find('03 '),gmail=find('04 '),cleanup=find('05 ');
const months=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const cfg={spreadsheet_id:'fixture-sheet',cv_active_folder_id:'fixture-cv',monthly_sheets:months,timezone:'UTC',publication_start:'',publication_end:'',workbook_year:2026,age_days:90,target_statuses:['Mismatch','Closed'],dry_run:true};
check('five inactive templates, empty execution data and no credential bindings',()=>{
 assert.equal(workflows.length,5);
 for(const w of workflows){
  assert.match(w.name,/^TEMPLATE - /);assert.equal(w.active,false);assert.equal(Object.keys(w.pinData).length,0);
  assert.equal(w.id,undefined);assert.equal(w.meta,undefined);
  const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);
  for(const n of w.nodes){assert.equal(n.credentials,undefined);if(/scheduleTrigger|webhook$/.test(n.type)) assert.equal(n.disabled,true);}
  for(const [from,ports] of Object.entries(w.connections)){
   assert.ok(names.has(from));for(const lanes of Object.values(ports))for(const lane of lanes)for(const e of lane)assert.ok(names.has(e.node),`${from} -> ${e.node}`);
  }
 }
});
check('embedded JavaScript and expressions compile; referenced nodes exist',()=>{
 for(const w of workflows) for(const n of w.nodes){
  const raw=JSON.stringify(n.parameters);
  for(const [,name] of raw.matchAll(/\$\(['"]([^'"]+)['"]\)/g))assert.ok(w.nodes.some(n=>n.name===name),`${w.name}: ${name}`);
  function walk(o){if(typeof o==='string'){
   if(o.startsWith('={{')&&o.endsWith('}}'))new Function('$json','$','$input',`return (${o.slice(3,-2)});`);
  }else if(o&&typeof o==='object')Object.values(o).forEach(walk);}
  walk(n.parameters);
  if(n.parameters.jsCode) new Function('$json','$input','$',n.parameters.jsCode);
 }
});
check('placeholder configuration stops before external requests',()=>{
 for(const w of [saver,cover,cleanup])assert.throws(()=>run(w,'Config'),/Configure spreadsheet_id/);
 const resolved=run(scraper,'Resolve Search Plan',[{}]);
 assert.throws(()=>run(scraper,'Build RSS Feed Requests',[resolved[0].json]),/RSS feed/);
});
check('RSS duplicate IDs keep the more complete record',()=>{
 const r=run(scraper,'Deduplicate + Split Jobs',[{jobs:[{job_id:'1234567890',title:'Role'},{job_id:'1234567890',title:'Role',company_name:'Example'},{job_id:'9876543210',title:'Other'}]}]);
 assert.equal(r.length,2);assert.equal(r[0].json.company_name,'Example');
});
check('RSS normalizes URLs and respects freshness, keywords and configured timezone',()=>{
 const ctx={feed_url:'https://example.invalid/feed',source:'FetchRSS',search_keyword:'Example profession',keywords:['engineer'],timezone:'Pacific/Auckland',max_age_hours:24,default_work_mode:'Hybrid'};
 const feed=[{title:'Example Engineer',link:'https://www.linkedin.com/jobs/view/1234567890/?tracking=1',isoDate:'2026-10-29T10:00:00Z'}, {title:'Old engineer',link:'https://www.linkedin.com/jobs/view/2222222222',isoDate:'2026-10-20T10:00:00Z'},{title:'Unrelated',link:'https://www.linkedin.com/jobs/view/3333333333',isoDate:'2026-10-29T10:00:00Z'},{title:'Fake engineer',link:'https://evillinkedin.com/jobs/view/4444444444',isoDate:'2026-10-29T10:00:00Z'}];
 const r=run(scraper,'Normalize RSS Feed',feed,{'Loop RSS Feeds':ctx},'2026-10-29T12:00:00Z')[0].json.jobs;
 assert.equal(r.length,1);assert.equal(r[0].url,'https://www.linkedin.com/jobs/view/1234567890');assert.equal(r[0].work_mode,'Hybrid');assert.match(r[0].date_posted,/29\/10\/2026 23:00/);
});
const job={job_id:'1234567890',status:'To do',date_scraped:'29/10/2026 12:00',posted_at:'2026-10-29',date_posted:'29/10/2026',title:'Example role',url:'https://www.linkedin.com/jobs/view/1234567890',source:'LinkedIn Alert'};
check('saver restores the entire batch after Config and preserves the 25-column contract',()=>{
 const r=run(saver,'Format Jobs',[cfg],{'Receive Jobs':[job,{...job,job_id:'9876543210'}]});assert.equal(r.length,2);
 const prepared=run(saver,'Prepare Monthly Row',[r[0].json],{Config:cfg})[0].json;
 assert.equal(prepared.target_sheet,'OUTUBRO');assert.equal(prepared.row_values.length,25);assert.match(prepared.dedupe_url,/fixture-sheet/);
 assert.equal(new URL(prepared.dedupe_url).searchParams.getAll('ranges').length,12);
});
check('historical duplicate detection and next row calculation',()=>{
 const ctx={...job,target_sheet:'OUTUBRO'};
 const ranges={valueRanges:[{range:'SETEMBRO!A1:A2',values:[['Job ID'],['1234567890']]},{range:'OUTUBRO!A1:A3',values:[['Job ID'],['other'],['third']]}]};
 let r=run(saver,'Check Duplicate',[ranges],{'Prepare Monthly Row':ctx,Config:cfg})[0].json;
 assert.equal(r.is_new,false);assert.equal(r.next_rows_by_sheet.OUTUBRO,4);
 r=run(saver,'Check Duplicate',[ranges],{'Prepare Monthly Row':{...ctx,job_id:'new'},Config:cfg})[0].json;assert.equal(r.is_new,true);
 const custom=run(saver,'Check Duplicate',[{valueRanges:[{range:'October!A1:A2',values:[['Job ID'],['other']]}]}],{'Prepare Monthly Row':{...ctx,job_id:'new',target_sheet:'October'},Config:{...cfg,monthly_sheets:['October']}})[0].json;
 assert.equal(custom.next_row,3);assert.equal(custom.next_rows_by_sheet.October,3);
});
function parseJob(j=job,conf=cfg,html=''){
 return run(saver,'Parse LinkedIn Job Page',[{data:html}],{'Is New Job?':{...j,next_rows_by_sheet:Object.fromEntries(months.map(m=>[m,2]))},Config:conf})[0].json;
}
check('publication window accepts other years, rejects configured exclusions and missing dates',()=>{
 assert.equal(parseJob({...job,posted_at:'2027-02-01',date_posted:'01/02/2027'}).date_scope_eligible,true);
 assert.equal(parseJob({...job,posted_at:'2027-02-01',date_posted:'01/02/2027'}).target_sheet,'FEVEREIRO');
 assert.equal(parseJob(job,{...cfg,publication_start:'2027-01-01'}).date_scope_eligible,false);
 assert.equal(parseJob({...job,posted_at:'',date_posted:''}).date_scope_eligible,false);
 assert.equal(parseJob({...job,posted_at:'',date_posted:'31/02/2026'}).date_scope_eligible,false);
 assert.equal(parseJob({...job,posted_at:'2026-02-30',date_posted:''}).date_scope_eligible,false);
 assert.equal(parseJob(job,{...cfg,publication_start:'2026-10-29',publication_end:'2026-10-29'}).date_scope_eligible,true);
});
check('incoming alert date recovers an out-of-window public-page date',()=>{
 const r=parseJob(job,{...cfg,publication_start:'2026-01-01',publication_end:'2026-12-31'},'<script type="application/ld+json">{"datePosted":"2020-01-01"}</script>');
 assert.equal(r.date_scope_eligible,true);assert.equal(r.date_posted_source,'incoming_scope_fallback');
});
const alertCfg={allowed_sender:'jobalerts-noreply@linkedin.com',source_label:'Alerts',processed_label:'Processed',review_label:'Review',keyword_overrides:[],timezone:'UTC'};
check('Gmail labels are resolved from user configuration; missing labels fail clearly',()=>{
 const r=run(gmail,'Resolve Alert Labels',[{name:'Alerts',id:'a'},{name:'Processed',id:'b'},{name:'Review',id:'c'}],{'Alert Configuration':alertCfg})[0].json;
 assert.equal(r.source_label_id,'a');assert.match(r.gmail_query,/-label:Processed/);
 assert.throws(()=>run(gmail,'Resolve Alert Labels',[],{'Alert Configuration':alertCfg}),/labels/);
});
const mail={id:'synthetic-email',subject:'"Example profession": posted on 10/29/2026',from:{value:[{address:'jobalerts-noreply@linkedin.com'}]},text:'Your job alert for Example profession 2 new jobs',html:'<a href="https://www.linkedin.com/jobs/view/1234567890">Example role</a><p>Example Company · Example City (Remote)</p><a href="https://www.linkedin.com/jobs/view/1234567890">Example role</a>'};
const parseMail=m=>run(gmail,'Extract LinkedIn Alert Jobs',[m],{'Resolve Alert Labels':alertCfg})[0].json;
check('Gmail extracts and deduplicates jobs without a personal keyword override',()=>{
 const r=parseMail(mail);assert.equal(r.job_count,1);assert.equal(r.ready_for_job_saver,true);assert.equal(r.jobs[0].search_keyword,'Example profession');assert.equal(r.jobs[0].date_posted,'29/10/2026');
});
check('Gmail review path handles unexpected senders, missing IDs and failed authentication',()=>{
 assert.equal(parseMail({...mail,from:{value:[{address:'other@example.invalid'}]}}).ready_for_job_saver,false);
 assert.equal(parseMail({...mail,html:'<p>No job link</p>'}).ready_for_job_saver,false);
 assert.equal(parseMail({...mail,headers:{'authentication-results':'dkim=fail header.d=linkedin.com'}}).ready_for_job_saver,false);
});
check('cover letters require manual qualification, description and an empty output cell',()=>{
 const row=Array(25).fill('');row[0]='1234567890';row[11]='Synthetic role description';row[19]='Yeap';
 const excluded=[...row];excluded[20]='Already generated';
 const unqualified=[...row];unqualified[19]='Nope';
 const r=run(cover,'Filter Qualified Jobs',[{valueRanges:[{range:'OUTUBRO!A1:Y4',values:[Array(25).fill('header'),row,excluded,unqualified]}]}]);
 assert.equal(r.length,1);assert.equal(r[0].json.row_number,2);
 assert.throws(()=>run(cover,'Parse Cover Letter',[{}],{'Prepare Cover Letter Prompt':{}}),/empty/);
});
check('Sheets URL expressions use configured IDs and target only the intended output cell',()=>{
 const url=expression(node(cover,'Update Cover Letter').parameters.url,{target_sheet:'MARÇO',row_number:7},{Config:cfg});
 assert.equal(decodeURIComponent(url),'https://sheets.googleapis.com/v4/spreadsheets/fixture-sheet/values/\'MARÇO\'!U7');
 const read=expression(node(cover,'Read All Monthly Sheets').parameters.url,{}, {Config:cfg});assert.equal(new URL(read).searchParams.getAll('ranges').length,12);
 const save=expression(node(saver,'Save New Job').parameters.url,{write_range_encoded:'OUTUBRO!A2:Y2'},{Config:cfg});assert.match(save,/fixture-sheet\/values\/OUTUBRO!A2:Y2$/);
});
check('cleanup reads all configured months and retains physical row numbers',()=>{
 const r=run(cleanup,'Normalize Cleanup Rows',[{valueRanges:[{range:"'JANEIRO'!A1:C3",values:[['Job ID','Status','Date Scraped'],['one','Closed','01/01/2026'],[],['two','Mismatch','01/01/2026']]}]}]);
 assert.equal(r[2].json.row_number,4);assert.equal(r[0].json._cleanup_sheet,'JANEIRO');
 const url=expression(node(cleanup,'Read Monthly Cleanup Rows').parameters.url,cfg);assert.equal(new URL(url).searchParams.getAll('ranges').length,12);
});
check('cleanup preserves protected rows, ignores invalid dates and orders deletion blocks bottom-up',()=>{
 const rows=[{_cleanup_sheet:'JANEIRO',row_number:2,Status:'Applied','Date Scraped':'01/01/2000'},... [3,4,7].map(row_number=>({_cleanup_sheet:'JANEIRO',row_number,Status:'Closed','Date Scraped':'01/01/2000'})),{_cleanup_sheet:'JANEIRO',row_number:8,Status:'Closed','Date Scraped':'31/02/2026'},{_cleanup_sheet:'JANEIRO',row_number:1,Status:'Closed','Date Scraped':'01/01/2000'}];
 const r=run(cleanup,'Build Cleanup Plan',rows,{Config:cfg})[0].json;assert.equal(r.matched_rows,3);assert.equal(r.ignored_invalid_dates,1);assert.equal(r.blocks[0].start_row,7);assert.equal(r.blocks[1].start_row,3);assert.equal(r.blocks[1].number_to_delete,2);
 assert.equal(expression(node(cleanup,'Has Rows to Delete?').parameters.conditions.conditions[0].leftValue,r),false);
 assert.equal(expression(node(cleanup,'Has Rows to Delete?').parameters.conditions.conditions[0].leftValue,{...r,dry_run:false}),true);
 const dry=run(cleanup,'Nothing to Delete',[r])[0].json;assert.equal(dry.status,'dry_run');assert.equal(dry.deleted_rows,0);assert.equal(dry.matched_rows,3);
});
check('cleanup applies the exact 90-day threshold in the configured timezone',()=>{
 const rows=[{_cleanup_sheet:'JANEIRO',row_number:2,Status:'Closed','Date Scraped':'31/07/2026 12:00'},{_cleanup_sheet:'JANEIRO',row_number:3,Status:'Closed','Date Scraped':'31/07/2026 12:01'}];
 const r=run(cleanup,'Build Cleanup Plan',rows,{Config:cfg},'2026-10-29T12:00:00Z')[0].json;
 assert.equal(r.matched_rows,1);assert.equal(r.blocks[0].start_row,2);
 const local=run(cleanup,'Build Cleanup Plan',rows,{Config:{...cfg,timezone:'America/Sao_Paulo'}},'2026-10-29T12:00:00Z')[0].json;
 assert.equal(local.matched_rows,0);
 const custom=run(cleanup,'Build Cleanup Plan',[{...rows[0],_cleanup_sheet:'January'}],{Config:{...cfg,monthly_sheets:['January']}},'2026-10-29T12:00:00Z')[0].json;
 assert.equal(custom.matched_rows,1);
});
check('no production account selectors, personal dates, feed tokens or credential metadata remain',()=>{
 const raw=JSON.stringify(workflows);
 assert.doesNotMatch(raw,/Priscila|Mestra|dquimas|20260901|20261231|inside_2026_sep_dec|https:\/\/fetchrss\.com\/feed\//i);
 assert.doesNotMatch(raw,/cachedResultUrl|cachedResultName|"credentials"|"webhookId"/);
 for(const match of raw.matchAll(/(?:spreadsheets\/|folders\/)([\w-]+)/g))assert.ok(match[1].startsWith('YOUR_'));
});
console.log(`\n${count} checks passed. Offline fixtures only; no service requests or production writes.`);
