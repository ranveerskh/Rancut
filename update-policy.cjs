const DAY=86400000;
function compare(a,b){
 const parse=v=>{if(typeof v!=='string'||!/^\d+\.\d+\.\d+$/.test(v))throw Error('Invalid version');return v.split('.').map(Number);};
 const x=parse(a),y=parse(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0;
}
function assetUrl(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hostname!=='github.com'||!/^\/ranveerskh\/Rancut\/releases\/download\/[^/]+\/[^/]+\.exe$/i.test(u.pathname))throw Error('Use a direct RanCut GitHub Release EXE URL.');return u.href;
}
function validateRelease(r){
 compare(r.version,r.version);assetUrl(r.downloadUrl);
 if(!/^[a-f0-9]{64}$/i.test(r.sha256||'')||!Number.isSafeInteger(r.size)||r.size<2||r.size>2147483648)throw Error('Release requires SHA-256 and installer size.');
 if(!Number.isFinite(Date.parse(r.publishedAt))||Date.parse(r.publishedAt)>Date.now()+300000)throw Error('Invalid publication date.');
 return {version:r.version,downloadUrl:r.downloadUrl,sha256:r.sha256.toLowerCase(),size:r.size,publishedAt:r.publishedAt,notes:String(r.notes||'').slice(0,4000),required:r.required===true};
}
function policy(current,r,now=Date.now()){
 if(!r||compare(r.version,current)<=0)return {available:false,blocked:false,warning:false,daysRemaining:null};
 const age=Math.max(0,now-Date.parse(r.publishedAt));
 return {available:true,blocked:r.required&&age>=30*DAY,warning:r.required&&age>=7*DAY,daysRemaining:Math.max(0,Math.ceil((30*DAY-age)/DAY))};
}
module.exports={compare,assetUrl,validateRelease,policy};
