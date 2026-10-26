/* IFB2/IFB3 are self-contained, versioned documents. No article lookup is used.
   Numeric/word-space rules and the IFB3 vocabulary are frozen for compatibility. */
const Codec = (() => {
  const glyphs=' .:-=+*#', alphabet=Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).join('')+'\n';
  const limits={title:150,author:80,deck:300,words:4000,body:32000,seed:131072,bytes:256000};
  // IFB3 frozen vocabulary: NEVER reorder or edit; existing codes depend on these indices.
  // Derived once from the first long-form corpus. Unlisted words and Unicode remain literal.
  const words=["the","that","could","had","was","and","people","without","would","because","were","not","she","they","whether","for","wanted","square","their","account","asked","its","required","described","than","from","remained","archive","collection","allocation","different","there","gathering","something","before","service","several","been","distinction","her","residents","instruction","did","light","morning","about","explained","another","experience","become","arrangement","maintenance","fountain","with","what","descriptions","became","chairs","representative","responsibility","technical","notebook","when","receiver","recordings","visitors","who","this","between","which","changed","someone","through","should","institution","description","investigation","made","received","appeared","while","receiving","question","courtyard","appointments","conversation","public","silence","arrived","city","more","remembered","thought","minutes","administrative","being","first","infrastructure","them","one","application","beside","longer","ordinary","proposed","nothing","but","whose","where","these","learned","neither","sometimes","difficult","reference","others","recognised","person","pell","found","every","nevertheless","those","interruption","district","have","although","already","some","produced","less","together","recorded","disliked","brought","proposal","decision","everyone","schedule","orbital","surface","interval","customer","municipal","equipment","nobody","recording","other","agreed","still","establish","after","shared","questions","rather","engineers","each","said","used","then","interpretation","moved","technician","explain","might","began","recollections","later","department","beneath","permission","difference","outside","waiting","deliberate","disagreements","individual","conversations","discovered","utility","commissioning","mattered","reason","system","boundary","deciding","dreams","describe","seemed","expected","report","official","needed","material","enough","mirror","sunlight","arrangements","only","disconnected","disagreement","continuation","beam","illumination","dependencies","photographer","suggested","staircase","agreement","small","somewhere","districts","years","statement","committee","afterward","practical","seven","anyone","version","absence","against","offered","both","station","demonstrate","certificate","answer","itself","vendor","records","responsible","disappeared","asking","access","allowed","history","experiences","paving","replacement","empty","patients","original","resident","replaced","acquired","never","followed","occupied","evidence","somebody","services","answered","solution","survived","recovery","depended","apparently","instrument","venn","historical","same","difficulty","supervisor","management","priorities","photograph","discussion","interested","conditions","behind","simply","marked","useful","decide","called","name","dream","cleaner","room","preserved","machinery","determine","relationships","heard","staff","existence","uncertain","sounded","receive","divided","entries","visited","following","afternoon","recognise","meeting","next","purpose","continued","officer","identical","resources","available","present","attention","leaving","contained","private","encounter","ownership","immediate","supported","machine","beginning","colleague","redevelopment","initially","corresponding","elsewhere","provision","sato","operators","route","routine","how","recollection","accompanying","nonessential","participants","demonstrated","his","announcement","instructions","machines","identify","familiar","happened","arranged","complete","knew","northern","recorder","borrowed","engineer","accepted","into","dalm","returned","versions","occurred","pavement","work","physical","preserve","deserved","make","welcomed","practice","whenever","children","specific","presence","software","possible","mornings","included","record","harder","moment","explanation","memory","office","interrupted","transitions","stood","reassurance","distributed","across","night","though","complicated"];
  const wordIndex=new Map(words.map((w,i)=>[w,i]));
  const count=s=>Array.from(s).length;
  function validate(a){
    if(!a||a.v!==2)throw Error('This document version is not supported.');
    for(const key of ['title','author','deck','body'])if(typeof a[key]!=='string'||count(a[key])>limits[key])throw Error('Invalid or oversized '+key+'.');
    if(!a.title.trim())throw Error('A document needs a title.');
    if(a.body.trim().split(/\s+/u).filter(Boolean).length>limits.words)throw Error('The body exceeds 4,000 words.');
    if(typeof a.image!=='string'||a.image.length!==3584||Array.from(a.image).some(c=>!glyphs.includes(c)))throw Error('The banner must contain 112 × 32 cells from the eight-symbol palette.');
    return {v:2,title:a.title,author:a.author,deck:a.deck,body:a.body,image:a.image};
  }
  async function transform(bytes,kind,format='gzip'){
    const stream=new Blob([bytes]).stream().pipeThrough(kind==='compress'?new CompressionStream(format):new DecompressionStream(format));
    const reader=stream.getReader(),parts=[];let size=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limits.bytes)throw Error('The decoded document is too large.');parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
    const all=new Uint8Array(size);let pos=0;for(const part of parts){all.set(part,pos);pos+=part.length}return all;
  }
  function base64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
  function packImage(image){const out=new Uint8Array(1344);let bit=0;for(const c of image){const value=glyphs.indexOf(c);for(let i=2;i>=0;i--,bit++)out[bit>>3]|=((value>>i)&1)<<(7-(bit%8))}return out}
  function unpackImage(bytes){let image='',bit=0;for(let n=0;n<3584;n++){let value=0;for(let i=0;i<3;i++,bit++)value=(value<<1)|((bytes[bit>>3]>>(7-bit%8))&1);image+=glyphs[value]}return image}
  function wordPack(text){
    const out=[],enc=new TextEncoder();for(const part of text.match(/[A-Za-z]+|[^A-Za-z]+/g)||[]){const index=wordIndex.get(part);if(index!==undefined){if(index<126)out.push(128+index);else out.push(254,index-126)}else for(const byte of enc.encode(part)){if(byte>=128)out.push(255);out.push(byte)}}return new Uint8Array(out);
  }
  function wordUnpack(bytes){
    const out=[],enc=new TextEncoder();for(let i=0;i<bytes.length;i++){const byte=bytes[i];if(byte<128)out.push(byte);else if(byte===255){if(++i>=bytes.length)throw Error('Truncated literal.');out.push(bytes[i])}else{let index=byte-128;if(byte===254){if(++i>=bytes.length)throw Error('Truncated word.');index=126+bytes[i]}if(!words[index])throw Error('Invalid word.');out.push(...enc.encode(words[index]))}if(out.length>limits.bytes)throw Error('Expanded text is too large.')}return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(out));
  }
  function packet(a,packed,tokenized=false){
    const enc=new TextEncoder(),fields=['title','author','deck','body'].map(k=>tokenized?wordPack(a[k]):enc.encode(a[k]));
    const image=packed?packImage(a.image):enc.encode(a.image),out=new Uint8Array(7+image.length+fields.reduce((n,b)=>n+b.length,0));
    out[0]=(packed?1:0)|(tokenized?2:0);const view=new DataView(out.buffer);for(let i=0;i<3;i++)view.setUint16(1+i*2,fields[i].length);
    let offset=7;out.set(image,offset);offset+=image.length;for(const field of fields){out.set(field,offset);offset+=field.length}return out;
  }
  function unpacket(bytes){
    if(bytes.length<7||bytes[0]>3)throw Error('Invalid document header.');
    const packed=!!(bytes[0]&1),tokenized=!!(bytes[0]&2),size=packed?1344:3584,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),dec=new TextDecoder('utf-8',{fatal:true});
    const text=bytes=>tokenized?wordUnpack(bytes):dec.decode(bytes);
    const lengths=[view.getUint16(1),view.getUint16(3),view.getUint16(5)];if(bytes.length<7+size+lengths.reduce((a,b)=>a+b,0))throw Error('Truncated document.');
    const image=packed?unpackImage(bytes.slice(7,7+size)):dec.decode(bytes.slice(7,7+size));let offset=7+size;const a={v:2,image};
    for(let i=0;i<3;i++){a[['title','author','deck'][i]]=text(bytes.slice(offset,offset+lengths[i]));offset+=lengths[i]}a.body=text(bytes.slice(offset));return validate(a);
  }
  async function encode(a){
    a=validate(a);
    // Symbol packing helps detailed banners; plain symbols may compress better for flat art.
    // Try both losslessly, and also retain the old format if it happens to be smaller.
    const candidates=await Promise.all([[false,false],[true,false],[false,true],[true,true]].map(async ([packed,tokenized])=>'IFB3.'+base64(await transform(packet(a,packed,tokenized),'compress','deflate-raw'))));
    candidates.push('IFB2.'+base64(await transform(new TextEncoder().encode(JSON.stringify(a)),'compress')));
    const seed=candidates.reduce((best,s)=>s.length<best.length?s:best);
    if(seed.length>limits.seed)throw Error('Encoded document is too large.');return seed;
  }
  function numeric(seed){
    // Digit pairs index the 96-character text alphabet. Single digits index image cells.
    // Short inputs repeat, making EVERY nonempty string a reproducible input.
    const digits=/^\d+$/.test(seed)?seed:Array.from(new TextEncoder().encode(seed),b=>String(b).padStart(3,'0')).join('');
    let at=0;const take=n=>{let s='';while(n--)s+=digits[(at++)%digits.length];return Number(s)};
    const titleLength=take(3)%150+1,authorLength=take(2)%80+1,bodyLength=take(4)%6000+500;
    const text=n=>Array.from({length:n},()=>alphabet[take(2)%alphabet.length]).join('');
    let title=text(titleLength);if(!title.trim())title='[ SILENCE ]';const author=text(authorLength);
    const image=Array.from({length:3584},()=>glyphs[take(1)%8]).join('');
    const raw=text(bodyLength);const body=raw.match(/[\s\S]{1,420}/g).join('\n\n');
    return {v:2,title,author,deck:'An uncurated transmission. Meaning, if present, is incidental.',image,body};
  }
  async function decode(seed){
    if(!seed||seed.length>limits.seed)throw Error('Enter between 1 and 131,072 seed characters.');
    if(!/^IFB[23]\./.test(seed))return numeric(seed);
    try{
      const data=seed.slice(5);if(!/^[A-Za-z0-9_-]+$/.test(data))throw Error('encoding');
      const bytes=Uint8Array.from(atob(data.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
      if(seed.startsWith('IFB3.'))return unpacket(await transform(bytes,'decompress','deflate-raw'));
      const unpacked=await transform(bytes,'decompress');return validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(unpacked)));
    }catch(error){throw Error('This document code is damaged or exceeds its limits. '+error.message)}
  }
  function fresh(){
    // Rejection sampling avoids bias from reducing a byte modulo ten.
    function digits(length){let s='';while(s.length<length){const bytes=crypto.getRandomValues(new Uint8Array(4096));for(const b of bytes)if(b<250&&s.length<length)s+=b%10}return s}
    const header=digits(9),titleLength=Number(header.slice(0,3))%150+1,authorLength=Number(header.slice(3,5))%80+1,bodyLength=Number(header.slice(5,9))%6000+500;
    return header+digits(titleLength*2+authorLength*2+3584+bodyLength*2);
  }
  return {encode,decode,validate,fresh,limits,glyphs};
})();
if(typeof module!=='undefined')module.exports=Codec;
