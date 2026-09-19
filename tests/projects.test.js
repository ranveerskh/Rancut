import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {emptyProject} from '../src/timeline.js';
import {saveRecovery,loadRecovery} from '../src/storage.js';
import {savedEntry,projectOrder,saveProjectEntry,getProject,listProjects,editProjectEntry} from '../src/project-store.js';
test('named projects persist independently and survive reopening the database',async()=>{
 const a={...emptyProject(),name:'First'},b={...emptyProject(),name:'Second'};
 await saveProjectEntry({id:'a',project:a});await saveProjectEntry({id:'b',project:b});
 a.name='External mutation';assert.equal((await getProject('a')).name,'First');
 assert.equal((await getProject('b')).project.name,'Second');
 assert.equal((await listProjects()).length,2);
 await editProjectEntry('a',{name:'Renamed',pinned:true});const renamed=await getProject('a');assert.equal(renamed.project.name,'Renamed');assert(renamed.pinned);
 await editProjectEntry('a',{deleted:true});assert.equal(projectOrder(await listProjects()).length,1);assert.equal(projectOrder(await listProjects(),'',true)[0].name,'Renamed');
 await editProjectEntry('a',{deleted:false});assert.equal(projectOrder(await listProjects())[0].id,'a');
});
test('old recovery is retained after catalog schema upgrade',async()=>{
 const old={...emptyProject(),name:'Legacy'};await saveRecovery(old);await saveProjectEntry({id:'new',project:emptyProject()});assert.deepEqual(await loadRecovery(),old);
});
test('recovery is bounded, deep persisted and forced checkpoints retain prior edits',async()=>{
 let entry=savedEntry(null,{id:'test',project:emptyProject()},1000);
 for(let n=1;n<=9;n++)entry=savedEntry(entry,{id:'test',project:{...emptyProject(),name:'Edit '+n}},1000+n*61000);
 assert.equal(entry.backups.length,5);assert.equal(entry.backups[0].project.name,'Edit 8');
 const unchanged=savedEntry(entry,{id:'test',project:entry.project},999999,true);assert.deepEqual(unchanged.backups,entry.backups);
 const changed=savedEntry(entry,{id:'test',project:{...entry.project,name:'Final'}},entry.updatedAt+100,true);assert.equal(changed.backups[0].project.name,'Edit 9');
 await saveProjectEntry({id:'recover',project:emptyProject()});await saveProjectEntry({id:'recover',project:{...emptyProject(),name:'After edit'}},true);
 const recovered=await getProject('recover');assert.equal(recovered.backups.length,1);assert.equal(recovered.backups[0].project.name,'Untitled');
 const copy=structuredClone(recovered.backups[0].project);copy.name='Recovered copy';await saveProjectEntry({id:'recovered-copy',project:copy});assert.equal((await getProject('recover')).name,'After edit');
});
test('home filters trash and search independently and sorts pinned then recent',()=>{
 const items=[{id:'1',name:'Episode one',updatedAt:1,pinned:true},{id:'2',name:'Episode two',updatedAt:5},{id:'3',name:'Archived',updatedAt:9,deleted:true}];
 assert.deepEqual(projectOrder(items).map(x=>x.id),['1','2']);assert.equal(projectOrder(items,'TWO')[0].id,'2');assert.equal(projectOrder(items,'',true)[0].id,'3');
});
