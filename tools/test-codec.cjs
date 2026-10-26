const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),Codec=require(path.join(root,'codec.js'));
const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'examples.js'),'utf8'),context);const examples=JSON.parse(vm.runInContext('JSON.stringify(EXAMPLES)',context));
(async()=>{
  for(const item of examples){const doc=await Codec.decode(item.seed);assert.equal(doc.body.split(/\s+/u).length,item.words);assert(item.words>=3900&&item.words<=4000);assert.equal(new Set(doc.image).size,8);assert.deepEqual(await Codec.decode(await Codec.encode(doc)),doc)}
  const base=await Codec.decode(examples[0].seed);
  const docs=[{...base,title:'Échos ★ 世界',author:'Zoë / 作者',deck:'the city THE CITY',body:'Literal <script>alert(1)</script>.\n\nΚαλημέρα 🪐 中文\n'+String.fromCharCode(0)+'\n## A heading'}, {...base,title:'A'.repeat(150),body:Array(4000).fill('a').join(' ')},{...base,title:'Shortest',body:'',deck:'',author:''}];
  docs.push({...base,title:'Échos ★ 世界',body:base.body+'\n\nΚαλημέρα 🪐 中文'});
  for(const doc of docs){assert.deepEqual(await Codec.decode(await Codec.encode(doc)),doc);const old='IFB2.'+zlib.gzipSync(JSON.stringify(doc)).toString('base64url');assert.deepEqual(await Codec.decode(old),doc)}
  for(let i=0;i<30;i++){const seed=Codec.fresh(),a=await Codec.decode(seed);assert(/^\d+$/.test(seed));assert.deepEqual(await Codec.decode(seed),a);assert.deepEqual(await Codec.decode(await Codec.encode(a)),a)}
  for(const s of ['0','12345','hello world','世界',' '])assert.deepEqual(await Codec.decode(s),await Codec.decode(s));
  await assert.rejects(()=>Codec.encode({...base,title:'A'.repeat(151)}));await assert.rejects(()=>Codec.encode({...base,body:Array(4001).fill('a').join(' ')}));await assert.rejects(()=>Codec.encode({...base,body:'a'.repeat(32001)}));await assert.rejects(()=>Codec.encode({...base,image:' '.repeat(3583)}));await assert.rejects(()=>Codec.decode('IFB3.bad'));await assert.rejects(()=>Codec.decode('a'.repeat(131073)));
  const oversized='IFB3.'+zlib.deflateRawSync(Buffer.alloc(256001)).toString('base64url');await assert.rejects(()=>Codec.decode(oversized));
  const badHeader='IFB3.'+zlib.deflateRawSync(Buffer.from([8,0,0,0,0,0,0])).toString('base64url');await assert.rejects(()=>Codec.decode(badHeader));
  console.log('PASS: both full-length examples; all eight image tones; lossless Unicode, controls and markup; old IFB2; 30 numeric seeds; arbitrary input; title/word/character limits; corrupt and oversized payload rejection.');
})().catch(error=>{console.error(error);process.exitCode=1});
