import {check} from './common.mjs';

// One record per slot contains state AND request log; memory installs after oncomplete.
// This database never reads PT-NT's database, localStorage keys, or HTML format.
export class IndexedDBStore {
  constructor({database='crossweave-CW-M1-save-1', indexedDB=globalThis.indexedDB}={}) {
    this.database=database;this.indexedDB=indexedDB;this.connection=null;
  }
  async db() {
    check(this.indexedDB,'indexeddb_unavailable');
    if(!this.connection)this.connection=new Promise((resolve,reject)=>{
      const request=this.indexedDB.open(this.database,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('slots');
      request.onerror=()=>reject(Object.assign(new Error('storage_open_failed'),{code:'storage_open_failed'}));
      request.onblocked=()=>reject(Object.assign(new Error('storage_open_blocked'),{code:'storage_open_blocked'}));
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();this.connection=null;};resolve(request.result);};
    });
    return this.connection;
  }
  async load(slot) {
    const db=await this.db();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('slots','readonly'),request=tx.objectStore('slots').get(slot);
      tx.oncomplete=()=>resolve(request.result??null);
      tx.onabort=tx.onerror=()=>reject(Object.assign(new Error('storage_read_failed'),{code:'storage_read_failed'}));
    }).catch(error=>{throw typeof error.code==='string'?error:Object.assign(new Error('storage_read_failed'),{code:'storage_read_failed'});});
  }
  async commit(slot, expectedRevision, document) {
    const db=await this.db();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('slots','readwrite'),store=tx.objectStore('slots'),request=store.get(slot);
      let error=null;
      request.onsuccess=()=>{
        const old=request.result;
        const actual=old===undefined?null:old.revision;
        if(actual!==expectedRevision){error=Object.assign(new Error(expectedRevision===null?'slot_not_empty':'stale_revision'),
          {code:expectedRevision===null?'slot_not_empty':'stale_revision',field:'expected_revision',details:{actual_revision:actual}});tx.abort();return;}
        try {store.put(document,slot);}catch(e){error=e;tx.abort();}
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>{};
      tx.onabort=()=>reject(error?.code?error:Object.assign(new Error('storage_write_failed'),{code:'storage_write_failed'}));
    }).catch(error=>{throw typeof error.code==='string'?error:Object.assign(new Error('storage_write_failed'),{code:'storage_write_failed'});});
  }
}
