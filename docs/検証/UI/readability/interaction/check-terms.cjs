// Read-only comparison after fetching the documented worldbuilding branch.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'terminology.json'),'utf8'));
const ref='refs/remotes/origin/'+saved.source.branch;
const current=cp.execFileSync('git',['rev-parse',ref],{cwd:__dirname,encoding:'utf8'}).trim();
const raw=cp.execFileSync('git',['show',current+':'+saved.source.path],{cwd:__dirname,encoding:'utf8'});
const sha=crypto.createHash('sha256').update(raw).digest('hex');
const rows=raw.split('\n').flatMap(line=>{const c=line.split('|').slice(1,-1).map(s=>s.trim());return c.length===4&&/^[A-Z]\d{2}$/.test(c[0])?[{id:c[0],old:c[1],current:c[2],status:c[3]}]:[];});
const before=new Map(saved.source_rows.map(r=>[r.id,r])),after=new Map(rows.map(r=>[r.id,r]));
const changes=[...new Set([...before.keys(),...after.keys()])].filter(id=>JSON.stringify(before.get(id))!==JSON.stringify(after.get(id))).map(id=>({id,before:before.get(id)||null,after:after.get(id)||null}));
const review=sha!==saved.source.sha256;
console.log(JSON.stringify({source_branch:saved.source.branch,recorded_commit:saved.source.commit,current_commit:current,content_unchanged:!review,changes,review_required:review},null,2));
if(review)process.exitCode=2;
