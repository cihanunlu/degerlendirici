function headerCells(canvas){
 // Find the uppermost ruled table rather than using fixed page coordinates.
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const w=canvas.width,h=canvas.height,data=ctx.getImageData(0,0,w,h).data;
 const dark=(x,y)=>data[4*(y*w+x)]<125;
 const lines=[];
 for(let y=2;y<h*.6;y++){
   let ink=0;
   for(let x=0;x<w;x+=2)if(dark(x,y)||dark(x,y-1)||dark(x,y+1))ink++;
   if(ink<w*.23)continue;
   const last=lines.at(-1);
   if(last&&y-last.end<4)last.end=y;else lines.push({start:y,end:y});
 }
 for(let i=1;i<lines.length;i++){
   const top=lines[i-1].end+1,bottom=lines[i].start-1,height=bottom-top;
   if(height<h*.006||height>h*.04)continue;
   const borders=[];
   for(let x=1;x<w-1;x++){
     let ink=0;for(let y=top;y<=bottom;y++)if(dark(x,y))ink++;
     if(ink<height*.82)continue;
     const last=borders.at(-1);
     if(last&&x-last.end<4)last.end=x;else borders.push({start:x,end:x});
   }
   const left=borders[0],right=borders.at(-1);
   if(!left||right.start-left.end<w*.55)continue;
   const divider=borders.find(b=>b.start>left.end+(right.start-left.end)*.55&&b.start<right.start-w*.07);
   if(!divider)continue;
   return [[left.end+2,divider.start-2],[divider.end+2,right.start-2]].map(([x,end])=>{
     const crop=document.createElement('canvas');crop.width=end-x+16;crop.height=height+14;
     const g=crop.getContext('2d');g.fillStyle='white';g.fillRect(0,0,crop.width,crop.height);g.drawImage(canvas,x,top,end-x,height,8,7,end-x,height);return crop;
   });
 }
 return [];
}
function cleanTitleCrop(original){
 const x=8,y=9,width=original.width-16,height=original.height-y-8;
 const pixels=original.getContext('2d').getImageData(x,y,width,height);
 const columns=new Uint16Array(width);
 for(let row=0;row<height;row++){
   let ink=0;
   for(let col=0;col<width;col++)if(pixels.data[(row*width+col)*4]<150)ink++;
   for(let col=0;col<width;col++){
     const pos=(row*width+col)*4;
     const value=ink>width*.45||pixels.data[pos]>=195?255:pixels.data[pos];
     if(value<140)columns[col]++;
     pixels.data[pos]=pixels.data[pos+1]=pixels.data[pos+2]=value;
   }
 }
 const first=columns.findIndex(count=>count>=3),last=columns.findLastIndex(count=>count>=3);
 if(first<0)return original;
 const crop=document.createElement('canvas');crop.width=last-first+17;crop.height=height+16;
 const ctx=crop.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);
 ctx.putImageData(pixels,8-first,8,first,0,last-first+1,height);
 return crop;
}
async function ocrHeading(canvas,worker,body=''){
 const cells=headerCells(canvas);if(!cells.length)return '';
 await worker.setParameters({tessedit_pageseg_mode:'7'});
 try{
   const title=(await worker.recognize(cells[0])).data.text.trim().replace(/^[^\p{L}]+|[^\p{L}\d)]+$/gu,'');
   const raw=(await worker.recognize(cells[1])).data.text.trim().replace(/[^A-ZÇĞİÖŞÜ0-9]/gu,'');
   const m=raw.match(/^([A-ZÇĞÖŞÜ]{2,6})([Iİl1\d]{3,4})$/u);
   if(!m||!title){
     // With a blurred scan, corroborate both cells against text elsewhere on the page.
     const prefix=raw.match(/^([A-ZÇĞÖŞÜ]{2,6})\d/)?.[1];
     const codes=[...new Set(body.match(/\b[A-ZÇĞİÖŞÜ]{2,6}\d{3,4}\b/gu)||[])].filter(c=>prefix&&c.startsWith(prefix));
     if(codes.length!==1)return '';
     const attempt=(await worker.recognize(cleanTitleCrop(cells[0]))).data.text.trim();
     const shape=s=>s.toLocaleLowerCase('tr-TR').replace(/[ijıl1]/g,'l');
     if(!/^\p{L}{5,}$/u.test(attempt))return '';
     const matches=(body.match(/\p{L}+/gu)||[]).filter(word=>shape(word)===shape(attempt));
     const candidates=[...new Set(matches.map(word=>word.toLocaleLowerCase('tr-TR')))];
     if(candidates.length!==1)return '';
     const label=matches.find(word=>/^\p{Lu}/u.test(word))||matches[0];
     return 'Dersin adı: '+label+'\nDers kodu: '+codes[0]+'\n';
   }
   return 'Dersin adı: '+title+'\nDers kodu: '+m[1]+m[2].replace(/[Iİl]/g,'1')+'\n';
 }finally{await worker.setParameters({tessedit_pageseg_mode:'3'})}
}
