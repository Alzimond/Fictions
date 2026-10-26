/* Display estimates only: never changes encoded article contents or existing seeds. */
const Reading=(()=>{
  const wordsPerMinute=220;
  const fromWords=words=>Math.max(1,Math.ceil(words/wordsPerMinute));
  function estimate(body,symbolic=false){
    const text=body.replace(/^## /gm,'').trim();
    const words=text?text.split(/\s+/u).length:0;
    const characters=Array.from(text.replace(/\s/gu,'')).length;
    const equivalentWords=symbolic?Math.ceil(characters/6):words;
    return {minutes:fromWords(equivalentWords),words,characters,explanation:symbolic
      ?'Approximate scan time for unstructured symbols: six non-space characters per word-equivalent, at 220 per minute.'
      :'Estimated from the article text at 220 words per minute.'};
  }
  return {estimate,fromWords};
})();
if(typeof module!=='undefined')module.exports=Reading;
