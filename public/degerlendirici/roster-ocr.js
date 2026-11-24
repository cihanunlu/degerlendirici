function cropRoster(canvas,left,top,right,bottom){
 const x=Math.max(0,Math.floor(left)),y=Math.max(0,Math.floor(top)),w=Math.max(1,Math.min(canvas.width-x,Math.ceil(right)-x)),h=Math.max(1,Math.min(canvas.height-y,Math.ceil(bottom)-y));
 const cropped=document.createElement('canvas');cropped.width=w;cropped.height=h;
 cropped.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);return {cropped,x,y};
}
async function createRosterWorker(){
 if(typeof Tesseract==='undefined')await loadLibrary('Tesseract');
 return Tesseract.createWorker('tur',1,{workerPath:new URL('worker.min.js',document.baseURI).href,corePath:new URL('tesseract-core-lstm.wasm.js',document.baseURI).href,langPath:new URL('.',document.baseURI).href,workerBlobURL:false});
}
async function scanRosterPage(canvas,worker,segmentation='3'){
 const result=blankRoster();result.scanned=true;
  // Restore automatic page segmentation after the previous page's column reads.
  await worker.setParameters({tessedit_pageseg_mode:segmentation,tessedit_char_whitelist:''});
  const full=(await worker.recognize(canvas)).data,words=full.words||[];
  result.scanStats={words:words.length};
  result.examList=/yoklama/i.test(full.text);
  result.code=full.text.match(/Ders\s+Kodu\s*[:|]?\s*([A-ZÇĞİÖŞÜ]{2,6}\s*\d{3,4})/i)?.[1]||'';
  result.name=full.text.match(/Ders\s+Ad[ıi]\s*[:|]\s*([^\n]+)/i)?.[1]?.trim()||'';
  const marks=words.filter(w=>/^ogrenci(?:\s*no\.?)?$/.test(norm(w.text))),labels=words.filter(w=>/^ad[i]?$/.test(norm(w.text)));
  let header,nameHead;
  for(const id of marks){const h=id.bbox.y1-id.bbox.y0;
   const candidate=labels.find(w=>w.bbox.x0>id.bbox.x0&&Math.abs(w.bbox.y0-id.bbox.y0)<h*.9);
   if(candidate){header=id;nameHead=candidate;break}
  }
  // In OBS's semester attendance layout the name and surname are separate
  // columns. On a scan, the short "Adı" heading can disappear entirely.
  const surnameLabel=words.find(w=>/^soyadi?$/.test(norm(w.text)));
  const nameBoundary=surnameLabel||nameHead;
  if(!header&&surnameLabel){
   header=surnameLabel;
   nameHead=labels.find(w=>w.bbox.x0<surnameLabel.bbox.x0&&Math.abs(w.bbox.y0-surnameLabel.bbox.y0)<30);
  }
  // In exam rosters the adjacent words "Adı Soyadı" label one column.
  const splitNames=surnameLabel&&(nameHead?
   surnameLabel.bbox.x0-nameHead.bbox.x1>(nameHead.bbox.y1-nameHead.bbox.y0)*2:
   words.some(w=>/(alma|devamsiz)/.test(norm(w.text))&&Math.abs(w.bbox.y0-surnameLabel.bbox.y0)<35));
  const surnameHead=splitNames?surnameLabel:null;
  const long=words.filter(w=>/^\d{7,16}$/.test(w.text)&&(!header||w.bbox.y0>header.bbox.y1));
  Object.assign(result.scanStats,{numbers:long.length,header:!!header});
  if(!long.length&&!header)return result;
  const median=ns=>ns.sort((a,b)=>a-b)[Math.floor(ns.length/2)];
  // The surname heading is a vertical landmark only. It does not mark
  // the horizontal start of the ID column when "Öğrenci No" was unreadable.
  const numericHeader=marks.find(w=>header&&Math.abs(w.bbox.y0-header.bbox.y0)<35&&(!nameHead||w.bbox.x0<nameHead.bbox.x0));
  const digitX=long.length?median(long.map(w=>w.bbox.x0)):
   numericHeader?numericHeader.bbox.x0:Math.max(0,(nameHead||surnameLabel||header).bbox.x0-canvas.width*(nameHead ? 0.15 : 0.28));
  const digitWidth=long.length?median(long.map(w=>w.bbox.x1-w.bbox.x0)):canvas.width*.08;
  const startY=header?header.bbox.y1+4:Math.max(0,long[0].bbox.y0-12);
  const next=nameBoundary&&words.filter(w=>w.bbox.x0>nameBoundary.bbox.x1&&Math.abs(w.bbox.y0-header.bbox.y0)<(header.bbox.y1-header.bbox.y0)*1.2&&!/soyad/i.test(norm(w.text))).sort((a,b)=>a.bbox.x0-b.bbox.x0)[0];
  const nameX=nameHead?nameHead.bbox.x0-6:digitX+digitWidth+3;
  const aligned=long.filter(w=>Math.abs(w.bbox.x0-digitX)<digitWidth*.4);
  const digitLeft=aligned.length?Math.min(...aligned.map(w=>w.bbox.x0))-5:digitX-9;
  const digitRight=aligned.length?Math.max(...aligned.map(w=>w.bbox.x1))+4:
   nameHead?nameX-2:digitX+digitWidth+14;
  const digits=cropRoster(canvas,digitLeft,startY,digitRight,canvas.height);
  const names=cropRoster(canvas,nameX,startY,surnameHead?surnameHead.bbox.x0-8:next?next.bbox.x0-6:canvas.width,canvas.height);
  await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'0123456789'});
  const ids=(await worker.recognize(digits.cropped)).data.words.filter(w=>/^\d{5,20}$/.test(w.text));
  // If the isolated strip lost lines, retain numbers independently recognized
  // at the same column in the full page. Bring their coordinates into strip space.
  for(const w of aligned){
   const center=(w.bbox.y0+w.bbox.y1)/2-digits.y;
   if(ids.some(t=>Math.abs((t.bbox.y0+t.bbox.y1)/2-center)<(w.bbox.y1-w.bbox.y0)*.8))continue;
   ids.push({...w,bbox:{x0:w.bbox.x0-digits.x,x1:w.bbox.x1-digits.x,y0:w.bbox.y0-digits.y,y1:w.bbox.y1-digits.y}});
  }
  ids.sort((a,b)=>a.bbox.y0-b.bbox.y0);
  result.scanStats.columnNumbers=ids.length;
  await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''});
  const letters=(await worker.recognize(names.cropped)).data.words;
  let surnames=[];
  if(surnameHead){
   const surname=cropRoster(canvas,surnameHead.bbox.x0-16,startY,next?next.bbox.x0-15:canvas.width,canvas.height);
   surnames=(await worker.recognize(surname.cropped)).data.words;
  }
  const lengths=ids.map(w=>w.text.length);const common=lengths.length?median(lengths):0;
  for(const [i,w] of ids.entries()){
   const y=(w.bbox.y0+w.bbox.y1)/2,height=w.bbox.y1-w.bbox.y0;
   const center=t=>(t.bbox.y0+t.bbox.y1)/2;
   const lineAt=(words,tolerance)=>words.filter(t=>Math.abs(center(t)-y)<height*tolerance).sort((a,b)=>a.bbox.x0-b.bbox.x0);
   let given=lineAt(letters,.85);
   // Given names can wrap onto two lines while the ID and surname remain
   // centered. Expand only when adjacent IDs leave room for that extra line.
   if(surnameHead){
    const top=i?(y+center(ids[i-1]))/2:y-height;
    const bottom=i+1<ids.length?(y+center(ids[i+1]))/2:y+height;
    given=letters.filter(t=>center(t)>top&&center(t)<bottom)
     .filter(t=>!(t.bbox.x1>=names.cropped.width-1&&t.text.length===1))
     .sort((a,b)=>Math.abs(center(a)-center(b))>height*.6?center(a)-center(b):a.bbox.x0-b.bbox.x0);
   }
   const text=given.concat(lineAt(surnames,.85));
   const name=text.map(t=>t.text).join(' ').replace(/^[^\p{L}]+|[^\p{L}.]+$/gu,'').trim();
   result.entries.push([w.text,name]);
   if(w.confidence<90||w.text.length!==common||text.some(t=>t.confidence<80)||!/^[\p{L}\s.’'-]+$/u.test(name))(result.uncertain??=[]).push(w.text);
  }
  result.detected=Math.max(ids.length,long.length);return result;
}
async function scanRosterOrientations(canvas,worker){
 let best=await scanRosterPage(canvas,worker);
 if(best.entries.length>=3||best.entries.length&&best.scanStats.header&&best.scanStats.numbers>=best.entries.length)return best;
 // Scanners sometimes store consecutive landscape attendance pages at
 // opposite quarter turns although the PDF rotation flag is identical.
 for(const direction of [-1,1]){
  const rotated=document.createElement('canvas');
  rotated.width=canvas.height;rotated.height=canvas.width;
  const ctx=rotated.getContext('2d');
  ctx.translate(rotated.width/2,rotated.height/2);ctx.rotate(direction*Math.PI/2);
  ctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
  try{
   const read=await scanRosterPage(rotated,worker);
   if(read.entries.length>best.entries.length)best=read;
   if(read.entries.length>=3&&read.scanStats.header)return read;
  }finally{rotated.width=0}
 }
 return best;
}
async function readRosterImage(file){
 const image=await createImageBitmap(file),scale=Math.min(3,2100/image.width);
 const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
 const worker=await createRosterWorker();
 try{return dedupRoster(await scanRosterOrientations(canvas,worker))}
 finally{canvas.width=0;await worker.terminate()}
}
