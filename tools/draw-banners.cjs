/* Optional art source generator. Run: node tools/draw-banners.cjs
   Creates two original 112 × 32, eight-tone symbol illustrations.
   After altering either banner, run node tools/build-featured.cjs. */
const fs=require('node:fs'),path=require('node:path');
const W=448,H=256,chars=' .:-=+*#';let pixels;
function clear(){pixels=new Float32Array(W*H)}
function point(x,y,v){x=Math.round(x);y=Math.round(y);if(x>=0&&x<W&&y>=0&&y<H)pixels[y*W+x]=Math.max(0,Math.min(1,v))}
function line(x1,y1,x2,y2,v=1,thick=1){const n=Math.ceil(Math.max(Math.abs(x2-x1),Math.abs(y2-y1)));for(let t=0;t<=n;t++){const f=n?t/n:0;for(let a=-thick/2;a<=thick/2;a++)for(let b=-thick/2;b<=thick/2;b++)point(x1+(x2-x1)*f+a,y1+(y2-y1)*f+b,v)}}
function rect(x,y,w,h,v){for(let py=Math.floor(y);py<y+h;py++)for(let px=Math.floor(x);px<x+w;px++)point(px,py,v)}
function ellipse(cx,cy,rx,ry,v,fill=false,thick=2){for(let y=cy-ry-thick;y<=cy+ry+thick;y++)for(let x=cx-rx-thick;x<=cx+rx+thick;x++){const d=Math.hypot((x-cx)/rx,(y-cy)/ry);if(fill?d<=1:Math.abs(d-1)<thick/Math.min(rx,ry))point(x,y,v)}}
function polygon(points,v){const ys=points.map(p=>p[1]);for(let y=Math.min(...ys);y<=Math.max(...ys);y++){const cuts=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))cuts.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))}cuts.sort((a,b)=>a-b);for(let i=0;i<cuts.length;i+=2)for(let x=cuts[i];x<=cuts[i+1];x++)point(x,y,v)}}
function grid(){for(let x=12;x<W;x+=28)for(let y=12;y<H;y+=28){line(x-2,y,x+2,y,.25);line(x,y-2,x,y+2,.25)}}
function frame(){for(const [x,y,sx,sy] of [[6,6,1,1],[441,6,-1,1],[6,249,1,-1],[441,249,-1,-1]]){line(x,y,x+sx*18,y,.9,2);line(x,y,x,y+sy*14,.9,2)}}
function render(){const out=[];const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];for(let cy=0;cy<32;cy++){let row='';for(let cx=0;cx<112;cx++){let value=0;for(let y=0;y<8;y++)for(let x=0;x<4;x++)value+=pixels[(cy*8+y)*W+cx*4+x];value/=32;const d=(bayer[(cy%4)*4+cx%4]/16-.5)*.09;row+=chars[Math.max(0,Math.min(7,Math.round((value+d)*7)))]}out.push(row)}return out.join('\n')+'\n'}
clear();grid();
// Receiving vault: perspective rails, recorder banks, layered reels and a central aperture.
for(let x=0;x<W;x++)for(let y=0;y<H;y++){const glow=Math.max(0,1-Math.hypot((x-224)/170,(y-115)/125));if(glow>.1)point(x,y,glow*.28)}
for(const x of [15,65,115,165,283,333,383,433])line(x,255,224+(x-224)*.13,116,.65,2);
for(const y of [151,171,196,229,253])line(10,y,438,y,.35,2);
for(let side=0;side<2;side++){for(let n=0;n<4;n++){const x=side?303+n*33:12+n*33;const depth=side?3-n:n;const top=30+depth*15,bottom=232-depth*15;rect(x,top,28,bottom-top,.77-depth*.08);rect(x+3,top+3,22,bottom-top-6,.1);for(let y=top+12;y<bottom-10;y+=24){rect(x+5,y,18,15,.38);ellipse(x+10,y+7,4,5,.92,true);ellipse(x+20,y+7,4,5,.7,true);line(x+8,y+13,x+22,y+13,.85,2)}}}
ellipse(224,110,64,86,.92,true);ellipse(224,110,58,80,.12,true);ellipse(224,110,52,73,.65);ellipse(224,110,45,64,.35,true);
for(let i=0;i<12;i++){const a=i*Math.PI/6;line(224+49*Math.cos(a),110+68*Math.sin(a),224+57*Math.cos(a),110+78*Math.sin(a),.9,3)}
ellipse(224,110,33,48,.14,true);ellipse(224,110,22,32,.82,true);ellipse(224,110,15,24,.27,true);ellipse(224,110,6,9,1,true);
line(150,110,298,110,.6,2);line(224,20,224,200,.5,2);rect(190,209,68,10,.8);rect(195,211,58,5,.15);
for(let x=169;x<279;x+=7)line(x,239,x,243-(x%5),.85,2);frame();
const dir=path.join(__dirname,'../featured');fs.writeFileSync(path.join(dir,'sleep-archive.art.txt'),render());
clear();grid();
// Orbital array above the ridge: curved planet, tessellated mirrors, towers and beam footprint.
ellipse(294,243,260,133,.72,true);ellipse(294,250,260,133,.1,true);
ellipse(345,51,32,40,.9,true);ellipse(345,51,21,27,.18,true);ellipse(345,51,8,10,.72,true);
polygon([[112,95],[260,167],[341,208],[231,216]],.17);
for(let row=0;row<3;row++)for(let col=0;col<5;col++){const x=32+col*30+row*12,y=27+row*24-col*3;polygon([[x,y],[x+27,y-3],[x+38,y+18],[x+11,y+21]],.8);polygon([[x+3,y+2],[x+25,y],[x+33,y+15],[x+12,y+18]],.25+((row+col)%3)*.16);line(x+14,y+1,x+24,y+17,.9,2)}
line(45,111,212,92,.85,4);line(126,102,145,133,.8,3);ellipse(147,136,13,8,.7,true);line(147,143,279,202,.5,2);
for(let i=0;i<15;i++){const x=9+i*30,top=179+(i*17%35);rect(x,top,23,256-top,.75);rect(x+3,top+3,17,256-top,.12);for(let y=top+9;y<253;y+=12)for(let wx=0;wx<2;wx++)rect(x+5+wx*8,y,4,5,.6);if(i%3===0)line(x+11,top,x+11,top-16,.8,2)}
polygon([[245,216],[293,210],[340,244],[270,249]],.95);for(let y=222;y<249;y+=8)line(264,y,323,y,.3,2);
line(270,230,270,241,.2,2);line(276,229,276,241,.2,2);line(270,235,277,235,.2,2);
for(let x=16;x<113;x+=9)line(x,151,x,155+(x%4),.7,2);frame();fs.writeFileSync(path.join(dir,'borrowed-daylight.art.txt'),render());
console.log('Wrote two 112 × 32 symbol illustrations.');
