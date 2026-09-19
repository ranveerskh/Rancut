export function newerVersion(candidate,current){
 const parse=v=>typeof v==='string'&&/^\d+\.\d+\.\d+$/.test(v)?v.split('.').map(Number):null;
 const a=parse(candidate),b=parse(current);if(!a||!b)throw Error('Invalid release version.');
 for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;
}
export function releaseUrl(value){
 if(!value)return null;const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password)throw Error('Release URLs must use HTTPS without credentials.');
 return u.href;
}
