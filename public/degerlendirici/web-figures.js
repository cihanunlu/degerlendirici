/* PDF form positions are in points, measured on the department's blank cover. */
const coverFields = [
  ['year', 132.74, 597.31, 92],
  ['season', 274.15, 597.31, 210],
  ['code', 126.74, 569.71, 410],
  ['name', 116.66, 542.11, 420],
  ['coverTeacher', 135.26, 514.51, 400]
];
const coverChecks = [
  [160.70, 459.31], [211.07, 431.69], [232.42, 404.09],
  [332.47, 376.61], [228.41, 349.01], [180.62, 321.41],
  [191.78, 265.34], [195.74, 250.58], [169.46, 235.94],
  [198.41, 221.30], [156.14, 206.66], [210.41, 192.02],
  [189.14, 177.38], [158.06, 162.62]
];
const coverActivityOrder = [0, 1, 2, 3, 4, 5, 7, 6];
let coverResources;
async function coverAsset(name) {
  const response = await fetch('print-assets/' + name);
  if (!response.ok) throw new Error('Kapak için gereken yerel dosya okunamadı: ' + name);
  return response.arrayBuffer();
}
async function webCoverPDF(data) {
  if (!coverResources) {
    coverResources = Promise.all([loadLibrary('PDFLib'), loadLibrary('fontkit'),
      coverAsset('cover-20261119.pdf'), coverAsset('Tinos-Regular.ttf')])
      .catch(error => { coverResources = null; throw error; });
  }
  const [pdfLib, kit, template, face] = await coverResources;
  const description = data.activities?.[6] ? String(data.otherActivity ?? '').trim().replace(/\s+/g,' ') : '';
  // The two-part template keeps the shifted footer and top text in separate PDF streams.
  const source = await pdfLib.PDFDocument.load(description ? await coverAsset('cover-parts-20261119.pdf') : template);
  const pdf = description ? await pdfLib.PDFDocument.create() : source;
  pdf.registerFontkit(kit);
  const font = await pdf.embedFont(face, {subset:true});
  const [original,footer] = source.getPages();
  const {width,height} = original.getSize();
  const page = description ? pdf.addPage([width,height]) : original;
  const split = 159.7;
  if(description){
    const top = await pdf.embedPage(original,{left:0,bottom:split,right:width,top:height});
    page.drawPage(top,{x:0,y:split});
  }
  for (const [key,x,y,available] of coverFields) {
    const value = String(data[key] ?? '').replace(/\s+/g, ' ').trim();
    if (value) {
      const width = font.widthOfTextAtSize(value, 12);
      page.drawText(value, {x,y,font,size:12*Math.min(1,available/width)});
    }
  }
  const selected = coverChecks.map((_,i) =>
    i < 6 ? data.present?.[i+1] : data.activities?.[coverActivityOrder[i-6]]);
  coverChecks.forEach(([x,y],i) => {
    if (!selected[i]) return;
    // Draw inside the original square, leaving the native glyph and its border intact.
    const joint = {x:x+2.95,y:y+1.5};
    page.drawLine({start:{x:x+1.65,y:y+2.85},end:joint,thickness:.8});
    page.drawLine({start:joint,end:{x:x+5.5,y:y+4.55},thickness:.8});
  });
  if(description){
    const x = 124.82, size = 10, lineHeight = 11.5, available = width-x-54;
    const measure = line => font.widthOfTextAtSize(line,size);
    const lines = [];
    let line = '';
    for(const word of description.split(' ')){
      const candidate = line ? line+' '+word : word;
      if(measure(candidate)<=available){line=candidate;continue}
      if(line)lines.push(line);
      line = '';
      for(const char of word){
        if(line&&measure(line+char)>available){lines.push(line);line=''}
        line += char;
      }
    }
    if(line)lines.push(line);
    const bottom = await pdf.embedPage(footer,{left:0,bottom:0,right:width,top:split});
    const shift = lines.length*lineHeight;
    lines.forEach((line,i)=>page.drawText(line,{x,y:split-(i+1)*lineHeight+1,font,size}));
    page.drawPage(bottom,{x:0,y:-shift});
  }
  return new Blob([await pdf.save()], {type:'application/pdf'});
}

const figureColors = ['#cbe6ce','#fff4b6','#d3e1e6','#f4c3c3','#bcebe4','#a6d4f3','#cfc3e6','#ffd8bf','#d1d1d1'];
const gradePercent=(count,total)=>'%'+(100*count/total).toLocaleString('tr-TR',{maximumFractionDigits:1});
function webChartCanvas(kind, data) {
  if (!['bars','chart','combined'].includes(kind)) throw new Error('Bilinmeyen grafik türü.');
  const rows = Array.from(data.counts ?? []).map(([label,n],i) => ({
    label:String(label), n:Math.max(0,Math.trunc(Number(n)||0)), color:figureColors[i%figureColors.length]
  }));
  const total = rows.reduce((sum,r) => sum+r.n,0);
  const combined = kind==='combined';
  const canvas = document.createElement('canvas');
  canvas.width = combined ? 1600 : 1084;
  canvas.height = combined ? 500 : 542;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  function text(value,x,y,size,align='center',limit,weight='normal') {
    ctx.fillStyle='#202327';
    ctx.font=weight+' '+size+'px "Times New Roman",serif';
    ctx.textAlign=align;
    ctx.textBaseline='middle';
    if(limit===undefined)ctx.fillText(String(value),x,y);
    else ctx.fillText(String(value),x,y,limit);
  }
  const title = combined ? '' : kind==='bars' ? 'Harf notu dağılımı · Sütun grafiği' : 'Harf notu dağılımı · Pasta grafiği';
  if(title)text(title,canvas.width/2,36,30,'center',canvas.width-50,'bold');
  if (!total) {
    text('Dağılım için dönem sonu harf notları gereklidir.',canvas.width/2,canvas.height/2,26);
    return canvas;
  }
  if (kind==='chart'||combined) {
    if(combined)text('Pasta grafiği',378,42,41,'center',680,'bold');
    const cx=combined?224:320, cy=combined?267:285, radius=combined?157:182;
    const visible=rows.filter(r=>r.n>0);
    let angle=-Math.PI/2;
    for(const r of visible) {
      const end=angle+2*Math.PI*r.n/total;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,radius,angle,end);ctx.closePath();
      ctx.fillStyle=r.color;ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();
      if(r.n/total>=.08){
        const mid=(angle+end)/2, distance=visible.length===1?0:radius*.66;
        text(gradePercent(r.n,total),cx+distance*Math.cos(mid),cy+distance*Math.sin(mid),combined?22:24);
      }
      angle=end;
    }
    const columns=Math.ceil(visible.length/(combined?6:9));
    const perColumn=Math.ceil(visible.length/columns);
    const start=combined?409:577, width=(combined?755:1044)-start;
    const step=Math.min(combined?52:48,338/perColumn);
    const fs=Math.min(combined?34:27,step*.78);
    visible.forEach((r,index)=>{
      const cell=width/columns;
      const x=start+Math.floor(index/perColumn)*cell;
      const y=cy+(index%perColumn-(perColumn-1)/2)*step;
      const box=Math.min(19,fs*.7);
      ctx.fillStyle=r.color;ctx.fillRect(x,y-box/2,box,box);
      ctx.strokeStyle='#767a7e';ctx.lineWidth=1;ctx.strokeRect(x,y-box/2,box,box);
      const label=(combined?r.label:(data.ranges?.[r.label]||r.label)+' · '+r.n)+'  '+gradePercent(r.n,total);
      text(label,x+box+8,y,fs,'left',Math.max(7,cell-box-16));
    });
  }
  if (kind==='bars'||combined) {
    if(combined)text('Sütun grafiği',1180,42,41,'center',760,'bold');
    const left=combined?790:68, right=combined?1570:1024;
    const base=combined?410:455, height=combined?250:319;
    const step=(right-left)/rows.length, max=Math.max(...rows.map(r=>r.n));
    ctx.beginPath();ctx.moveTo(left,base);ctx.lineTo(right,base);ctx.strokeStyle='#777';ctx.lineWidth=2;ctx.stroke();
    rows.forEach((r,i)=>{
      const x=left+(i+.5)*step, top=base-height*r.n/max;
      ctx.fillStyle='#82949d';ctx.fillRect(x-.28*step,top,.56*step,base-top);
      text(r.n,x,top-18,combined?34:28,'center',step*.88);
      text(r.label,x,base+28,combined?32:27,'center',step*.9);
    });
  }
  return canvas;
}

let activityStampFont;
async function activityPackageBytes(file,tag){
  const extension=file.name.split('.').at(-1).toLowerCase();
  if(!tag?.level || !tag.activity || !['pdf','jpg','jpeg','png','webp'].includes(extension))return file.arrayBuffer();
  const title=tag.activity.replace(/\s+sınavı$/iu,'').trim()+' - '+tag.level;
  if(extension!=='pdf'){
    const image=await createImageBitmap(file);
    try{
      const canvas=document.createElement('canvas');
      canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(image,0,0);
      // Match the physical size of the PDF stamp when the scan is printed on A4.
      const scale=Math.min(image.width,image.height)/595;
      ctx.scale(scale,scale);
      const label=title+' - 1/1',limit=image.width/scale-32;
      ctx.font='12px "Times New Roman", serif';
      const width=Math.min(limit,ctx.measureText(label).width+12);
      ctx.fillStyle='white';ctx.fillRect(12,12,width,22.5);
      ctx.strokeStyle='black';ctx.lineWidth=.75;ctx.strokeRect(12,12,width,22.5);
      ctx.fillStyle='black';ctx.fillText(label,18,27.75,width-12);
      const type=extension==='jpg'||extension==='jpeg'?'image/jpeg':'image/'+extension;
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.96));
      if(!blob||blob.type!==type)throw Error('Görsel damgalanamadı.');
      return blob.arrayBuffer();
    }finally{image.close()}
  }
  const [lib,kit]=await Promise.all([loadLibrary('PDFLib'),loadLibrary('fontkit')]);
  activityStampFont??=coverAsset('Tinos-Regular.ttf').catch(error=>{activityStampFont=null;throw error});
  const doc=await lib.PDFDocument.load(await file.arrayBuffer());
  doc.registerFontkit(kit);
  const font=await doc.embedFont(await activityStampFont,{subset:true});
  const pages=doc.getPages();
  pages.forEach((page,index)=>{
    const {x,y,width:w,height:h}=page.getCropBox();
    const rotation=((page.getRotation().angle%360)+360)%360;
    const frames={0:[1,0,0,1,x,y],90:[0,1,-1,0,x+w,y],180:[-1,0,0,-1,x+w,y+h],270:[0,-1,1,0,x,y+h]};
    const width=rotation%180?h:w,height=rotation%180?w:h;
    const label=title+' - '+(index+1)+'/'+pages.length;
    const unit=Math.min(1,width/100,height/60),margin=12*unit,pad=6*unit;
    const size=Math.min(12*unit,(width-2*(margin+pad))/font.widthOfTextAtSize(label,1));
    const bottom=height-margin-22.5*unit;
    page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...frames[rotation]));
    page.drawRectangle({x:margin,y:bottom,width:font.widthOfTextAtSize(label,size)+2*pad,height:22.5*unit,color:lib.rgb(1,1,1),borderColor:lib.rgb(0,0,0),borderWidth:.75*unit});
    page.drawText(label,{font,size,x:margin+pad,y:bottom+(22.5*unit-size)/2+1.5*unit,color:lib.rgb(0,0,0)});
    page.pushOperators(lib.popGraphicsState());
  });
  return doc.save();
}
