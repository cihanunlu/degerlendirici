const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const templates = new Map();
async function template(name) {
  if (!templates.has(name)) {
    const request = fetch(new URL('./templates/' + name, import.meta.url)).then(response => {
      if (!response.ok) throw Error('Belge şablonu açılamadı.');
      return response.arrayBuffer();
    }).catch(error => { templates.delete(name); throw error; });
    templates.set(name, request);
  }
  return JSZip.loadAsync(await templates.get(name));
}
const direct = (node, tag) => Array.from(node.childNodes).filter(el => el.localName === tag);
const all = (node, tag) => Array.from(node.getElementsByTagNameNS('*', tag));
const remove = node => node.parentNode?.removeChild(node);
const empty = node => { while (node.firstChild) node.removeChild(node.firstChild); };
const add = (parent, ns, tag) => parent.appendChild(parent.ownerDocument.createElementNS(ns,tag));
const parse = str => new DOMParser().parseFromString(str,'application/xml');
const xml = async (zip, name) => parse(await zip.file(name).async('string'));
const write = (zip, name, doc) => zip.file(name,new XMLSerializer().serializeToString(doc));
const upper = value => String(value || '').toLocaleUpperCase('tr');
function setRun(run, value) {
  Array.from(run.childNodes).filter(el => el.localName !== 'rPr').forEach(remove);
  String(value ?? '').split(/\r?\n/).forEach((line,i) => {
    if (i) add(run,W,'w:br');
    const text=add(run,W,'w:t');
    text.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
    text.textContent=line;
  });
}
function paragraph(p,value) {
  const runs=direct(p,'r');
  setRun(runs.shift() || add(p,W,'w:r'),value);
  runs.forEach(r=>setRun(r,''));
}
const otherActivity = data => data.activities?.[6] ? String(data.otherActivity ?? '').trim().replace(/\s+/g,' ') : '';
function cover(doc,data) {
  const body=all(doc,'body')[0],p=direct(body,'p');
  for (const [row,run,key] of [[5,2,'year'],[5,9,'season'],[7,2,'code'],[9,3,'name'],[11,2,'coverTeacher']])
    setRun(direct(p[row],'r')[run],data[key]);
  const check=(start,marks)=>marks.forEach((yes,i)=>{if(yes) all(p[start+i],'t').forEach(t=>t.textContent=t.textContent.replace('□','☑'));});
  check(14,data.present.slice(1,7));check(21,data.activities);
  setRun(direct(p[21],'r')[0],'Ara Sınavlar');
  const otherRuns=direct(p[27],'r');
  setRun(otherRuns[0],'Diğer');
  otherRuns.slice(1,5).forEach(remove);
  body.insertBefore(p[27],p[29]);
  const description=otherActivity(data);
  if(description){
    const detail=doc.createElementNS(W,'w:p'),prop=add(detail,W,'w:pPr');
    const spacing=add(prop,W,'w:spacing');
    spacing.setAttributeNS(W,'w:after','0');
    spacing.setAttributeNS(W,'w:line','240');
    spacing.setAttributeNS(W,'w:lineRule','auto');
    add(prop,W,'w:ind').setAttributeNS(W,'w:left','1416');
    const run=add(detail,W,'w:r');
    add(add(run,W,'w:rPr'),W,'w:sz').setAttributeNS(W,'w:val','20');
    setRun(run,description);
    body.insertBefore(detail,p[29]);
    const margins=direct(direct(body,'sectPr')[0],'pgMar')[0];
    margins.setAttributeNS(W,'w:top','1120');
    margins.setAttributeNS(W,'w:bottom','720');
  }
}
const numeric = v => v==null || String(v).trim()==='' || !Number.isFinite(Number(String(v).replace(',','.'))) ? null : Number(String(v).replace(',','.'));
const format = n => n == null ? '' : Number(n.toFixed(2)).toLocaleString('tr',{useGrouping:false});
function scores(sheet) {
  const absent=new Set(sheet.absentRows || []);
  const sums=sheet.questions.map(()=>0), counts=sums.slice(), totals=[];
  sheet.rows.forEach((row,i)=>{
    if (absent.has(i)||!String(row[0]??'').trim()) return;
    let sum=0,valid=0;
    sums.forEach((_,j)=>{
      const n=numeric(row[j+2]),limit=numeric(sheet.maximums[j]);
      if(n!==null && n>=0 && (limit===null||n<=limit)){sums[j]+=n; counts[j]++;sum+=n;valid++;}
    });
    if(valid && valid===sums.length) totals.push(sum);
  });
  return {means:sums.map((sum,i)=>counts[i]?sum/counts[i]:null),total:totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:null,count:totals.length};
}
function keepWithNext(p) {
  const pPr=direct(p,'pPr')[0] || p.insertBefore(p.ownerDocument.createElementNS(W,'w:pPr'),p.firstChild);
  const style=direct(pPr,'pStyle')[0];
  const keep=direct(pPr,'keepNext')[0] || pPr.insertBefore(p.ownerDocument.createElementNS(W,'w:keepNext'),style?style.nextSibling:pPr.firstChild);
  keep.setAttributeNS(W,'w:val','1');
}
function reportLine(proto,value,before,after,fontSize=null){
  const line=proto.cloneNode(true);
  paragraph(line,value);
  const properties=direct(line,'pPr')[0], alignment=direct(properties,'jc')[0];
  alignment.setAttributeNS(W,'w:val','left');
  const spacing=properties.insertBefore(line.ownerDocument.createElementNS(W,'w:spacing'),alignment);
  spacing.setAttributeNS(W,'w:before',before*20);
  spacing.setAttributeNS(W,'w:after',after*20);
  if(fontSize){
    const runProperties=direct(direct(line,'r')[0],'rPr')[0];
    direct(runProperties,'sz')[0].setAttributeNS(W,'w:val',fontSize*2);
  }
  return line;
}
function examTable(source,sheet,means,pageWidth) {
  const tbl=source.cloneNode(true), grid=direct(tbl,'tblGrid')[0], cols=direct(grid,'gridCol');
  const sourceWidths=cols.map(c=>Number(c.getAttributeNS(W,'w')));
  const count=sheet.questions.length, slots=Math.min(10,count);
  const labelWidth=sourceWidths[0], preferredWidth=sourceWidths.reduce((a,b)=>a+b,0);
  const tableWidth=Math.min(pageWidth,Math.max(preferredWidth,labelWidth+slots*sourceWidths[1]));
  const scoreWidth=tableWidth-labelWidth;
  const widths=[labelWidth,...Array.from({length:slots},(_,i)=>Math.round((i+1)*scoreWidth/slots)-Math.round(i*scoreWidth/slots))];
  const preferred=direct(direct(tbl,'tblPr')[0],'tblW')[0];
  preferred.setAttributeNS(W,'w:w',tableWidth);
  empty(grid);
  widths.forEach((width,i)=>{
    const col=cols[Math.min(i,cols.length-1)].cloneNode(true);
    col.setAttributeNS(W,'w:w',width);
    grid.appendChild(col);
  });
  const rows=direct(tbl,'tr');rows.forEach(remove);
  for(let start=0;start<count;start+=slots){
    const size=Math.min(slots,count-start);
    rows.forEach((sourceRow,ri)=>{
      const row=sourceRow.cloneNode(true), proto=direct(row,'tc'), trPr=direct(row,'trPr')[0];
      const noSplit=trPr.ownerDocument.createElementNS(W,'w:cantSplit');
      trPr.insertBefore(noSplit,direct(trPr,'trHeight')[0]);
      proto.slice(1).forEach(remove);
      for(let j=0;j<slots;){
        const idx=start+j, blank=j>=size, cell=proto[Math.min(j+1,proto.length-1)].cloneNode(true);
        const properties=direct(cell,'tcPr')[0], cellWidth=direct(properties,'tcW')[0];
        direct(properties,'gridSpan').forEach(remove);
        let span=blank?slots-j:1;
        if(!ri && sheet.grouped && !blank)while(j+span<size && sheet.questions[idx+span]===sheet.questions[idx])span++;
        if(span>1){
          const gridSpan=properties.ownerDocument.createElementNS(W,'w:gridSpan');
          gridSpan.setAttributeNS(W,'w:val',span);
          properties.insertBefore(gridSpan,cellWidth.nextSibling);
        }
        cellWidth.setAttributeNS(W,'w:w',widths.slice(j+1,j+1+span).reduce((a,b)=>a+b,0));
        const lines=direct(cell,'p');lines.slice(1).forEach(remove);
        paragraph(lines[0],blank?'':[upper(sheet.questions[idx]),sheet.maximums[idx],String(sheet.maps[idx]??'').replace(/^ÖÇ\s*/,''),format(means[idx])][ri]);
        row.appendChild(cell);j+=span;
      }
      if(ri<rows.length-1)all(row,'p').forEach(keepWithNext);
      tbl.appendChild(row);
    });
  }
  return tbl;
}
async function report(zip,doc,data,grouped) {
  const body=all(doc,'body')[0], p=direct(body,'p'), originals=direct(body,'tbl');
  setRun(direct(p[0],'r')[0],upper(data.code+' '+data.name));
  for (const [i,key] of [[1,'intro'],[10,'report'],[12,'actions']])paragraph(p[i],data[key]);
  [p[6],p[9],p[11]].forEach(keepWithNext);
  const evaluationProperties=direct(p[10],'pPr')[0];
  evaluationProperties.insertBefore(doc.createElementNS(W,'w:keepLines'),evaluationProperties.firstChild);
  const sig=grouped?14:15;
  paragraph(p[sig],data.teacher);
  p.slice(13).filter(node=>node!==p[sig]).concat(p[4],p[5],p[8]).forEach(remove);
  const section=direct(body,'sectPr')[0], page=direct(section,'pgSz')[0], margins=direct(section,'pgMar')[0];
  const pageWidth=Number(page.getAttributeNS(W,'w'))-Number(margins.getAttributeNS(W,'left'))-Number(margins.getAttributeNS(W,'right'));
  const exams=data.sheets.filter(s=>s.include && s.questions.length);
  exams.forEach((sheet,si)=>{
    const stats=scores(sheet);
    const cap=p[si?3:2].cloneNode(true), rs=direct(cap,'r');
    setRun(rs[0],'Tablo '+(si+1)+': ');
    setRun(rs[1],({'VİZE':'Ara sınav','FİNAL':'Final sınavı'}[upper(sheet.name)] || sheet.name));
    rs.slice(2).forEach(r=>setRun(r,''));
    keepWithNext(cap);
    body.insertBefore(cap,p[2]);
    body.insertBefore(examTable(originals[Math.min(si,1)],sheet,stats.means,pageWidth),p[2]);
    const summary=reportLine(p[10],stats.count?'Sınav ortalaması: '+format(stats.total)+' puan (n = '+stats.count+').':'Sınav ortalaması için tüm soru puanları girilmiş öğrenci bulunmuyor.',3,5,11);
    body.insertBefore(summary,p[2]);
  });
  [p[2],p[3],...originals].forEach(remove);
  if(data.counts.some(([,n])=>n>0)){
    const png=webChartCanvas('combined',data).toDataURL('image/png').split(',')[1];
    zip.file('word/media/image1.png',png,{base64:true});
    for(const extent of [...all(p[7],'extent'),...all(p[7],'ext')]){
      if(extent.hasAttribute('cx'))extent.setAttribute('cy',Math.round(Number(extent.getAttribute('cx'))*500/1600));
    }
  } else {
    paragraph(p[6],'Harf notu dağılımı');paragraph(p[7],'Dağılımı hesaplamak için dönem sonu notları gereklidir.');
  }
  if(data.outcomes?.length){
    const heading=p[9].cloneNode(true); paragraph(heading,'ÖĞRENME ÇIKTILARI');body.insertBefore(heading,p[11]);
    for(const result of data.outcomes){
      body.insertBefore(reportLine(p[10],'ÖÇ '+result.number+' — '+result.text,0,3),p[11]);
    }
  }
  const description=otherActivity(data);
  if(description){
    body.insertBefore(reportLine(p[10],'Diğer öğrenci faaliyeti: '+description,3,6),p[11]);
  }
}
const mime = {docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
// Optisyen keeps its answer sheet and column layout, but uses the grade
// template's own average-row styles, including the merged label borders.
export async function styleScoreSummary(bytes, firstScore) {
  const [book, reference]=await Promise.all([JSZip.loadAsync(bytes),template('grades.xlsx')]);
  const sheetPath='xl/worksheets/sheet1.xml',stylesPath='xl/styles.xml';
  const [sheet,model,styles,modelStyles]=await Promise.all([
    xml(book,sheetPath),xml(reference,sheetPath),xml(book,stylesPath),xml(reference,stylesPath)
  ]);
  const footer=all(sheet,'row').at(-1),sample=all(model,'row').at(-1);
  const sampleCells=direct(sample,'c'),cells=direct(footer,'c');
  for(const attr of ['ht','customHeight'])footer.setAttribute(attr,sample.getAttribute(attr));

  const mapped=new Map();
  function copyStyle(group,id){
    const key=group+':'+id;
    if(mapped.has(key))return mapped.get(key);
    const source=all(modelStyles,group)[0].children[Number(id)];
    const copy=styles.importNode(source,true),target=all(styles,group)[0];
    if(group==='cellXfs'){
      for(const [attr,list] of [['fontId','fonts'],['borderId','borders'],['fillId','fills']]){
        copy.setAttribute(attr,copyStyle(list,copy.getAttribute(attr)));
      }
    }
    const index=target.children.length;
    target.appendChild(copy);target.setAttribute('count',index+1);mapped.set(key,index);
    return index;
  }
  cells.forEach((cell,i)=>{
    const role=i===0?0:i===firstScore-1?2:i<firstScore?1:i===cells.length-1?sampleCells.length-1:3;
    cell.setAttribute('s',copyStyle('cellXfs',sampleCells[role].getAttribute('s')));
  });
  write(book,sheetPath,sheet);write(book,stylesPath,styles);
  return book.generateAsync({type:'blob',compression:'DEFLATE',mimeType:mime.xlsx});
}
export async function webNativeFile(kind,data) {
  if(kind==='cover-pdf')return webCoverPDF(data);
  if(kind==='bars'||kind==='chart')return new Promise((resolve,reject)=>webChartCanvas(kind,data).toBlob(b=>b?resolve(b):reject(Error('Grafik oluşturulamadı.')),'image/png'));
  if(kind==='xlsx'||kind==='xls'){
    const zip=await template('grades.xlsx');
    await workbook(zip,data);
    if(kind==='xls'){
      if(typeof XLSX==='undefined')await loadLibrary('XLSX');
      const book=XLSX.read(await zip.generateAsync({type:'uint8array'}),{cellStyles:true});
      return new Blob([XLSX.write(book,{bookType:'biff8',type:'array'})],{type:'application/vnd.ms-excel'});
    }
    return zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:mime.xlsx});
  }
  if(kind!=='report' && kind!=='cover-docx' && kind!=='cover')throw Error('Bilinmeyen belge türü.');
  const grouped=data.sheets.some(s=>s.include && s.grouped && s.questions.length);
  const zip=await template(kind==='report'?(grouped?'MBG370':'MBG174')+'-report.docx':'cover.docx');
  const doc=await xml(zip,'word/document.xml');
  if(kind==='report')await report(zip,doc,data,grouped);else cover(doc,data);
  write(zip,'word/document.xml',doc);
  return zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:mime.docx});
}
function letter(i) {
  let result='';for(;i>0;i=Math.floor((i-1)/26))result=String.fromCharCode(65+(i-1)%26)+result;
  return result;
}
function sheetXML(layout,course,sheet,tab,absenceStyle) {
  const doc=parse(layout), root=doc.documentElement, q=sheet.questions, anon=sheet.anonymous;
  const first=anon?2:4, firstRow=anon?6:4, total=first+q.length;
  const absent=new Set(sheet.absentRows||[]);
  const rows=sheet.rows.map((row,index)=>({row,index})).filter(({row})=>anon?String(row[0]??'').trim():row.some(v=>v!=='' && v!=null));
  const extra=anon?[]:[[-2,'Ham Not'],[-1,'Harf Notu']].filter(([index])=>rows.some(({row})=>row.at(index)!=null && row.at(index)!==''));
  const markedAbsent=row=>q.length&&q.every((_,j)=>/^G$/i.test(String(row[j+2])));
  const needsAttendance=rows.some(({row,index})=>absent.has(index)&&!markedAbsent(row));
  const attendance=needsAttendance?total+extra.length+1:0,width=attendance||total+extra.length,footer=firstRow+rows.length;
  const sourceCol=c=>c<first?c:c>=total?first+2:Math.min(c,first+1);
  const cols=all(root,'cols')[0],colDefs=direct(cols,'col');empty(cols);
  for(let c=1;c<=width;c++){
    const col=colDefs[sourceCol(c)-1].cloneNode(false);
    col.setAttribute('min',c);col.setAttribute('max',c);cols.appendChild(col);
  }
  all(root,'dimension')[0].setAttribute('ref','A1:'+letter(width)+footer);
  all(root,'sheetView')[0].setAttribute('tabSelected',tab?'0':'1');
  all(root,'selection')[0].setAttribute('sqref','A1');
  all(root,'pageSetUpPr')[0].setAttribute('fitToPage','1');
  const print=all(root,'pageSetup')[0];
  print.setAttribute('paperSize','9');
  print.setAttribute('orientation','landscape');
  print.setAttribute('fitToWidth','1');
  print.setAttribute('fitToHeight','0');
  print.removeAttribute('scale');
  const sd=all(root,'sheetData')[0],proto=direct(sd,'row');empty(sd);
  const cells=[];
  for(let r=1;r<=footer;r++){
    const model=proto[r===footer?firstRow:Math.min(r,firstRow)-1],row=model.cloneNode(false);row.setAttribute('r',r);sd.appendChild(row);
    const styles=direct(model,'c');cells[r]=[];
    for(let c=1;c<=width;c++){
      const cell=(styles[sourceCol(c)-1]||styles.at(-1)).cloneNode(false);
      cell.setAttribute('r',letter(c)+r);row.appendChild(cell);cells[r][c]=cell;
    }
  }
  const merges=all(root,'mergeCells')[0];empty(merges);
  const merge=(a,b)=>{if(a!==b)add(merges,X,'mergeCell').setAttribute('ref',a+':'+b);};
  function put(r,c,value){
    if(value==null||value==='')return;
    const cell=cells[r][c];
    if(typeof value==='number')add(cell,X,'v').textContent=value;
    else {cell.setAttribute('t','inlineStr');add(add(cell,X,'is'),X,'t').textContent=String(value);}
  }
  function formula(r,c,expression,cached){
    const cell=cells[r][c];
    add(cell,X,'f').textContent=expression;
    if(typeof cached!=='number')cell.setAttribute('t','str');
    add(cell,X,'v').textContent=cached??'';
  }
  merge('A1',letter(width)+'1');
  put(1,1,upper([course.code,course.name,sheet.name].join(' '))+(q.length?' SINAVI':''));
  if(anon){
    put(3,1,'Öğrenme Çıktı Numarası');put(4,1,'Soru puanı');put(5,1,sheet.ordinalLabel||'#');
  }else{
    ['#','Öğrenci No',' Adı Soyadı'].forEach((title,i)=>{put(2,i+1,title);merge(letter(i+1)+'2',letter(i+1)+'3');});
    if(!sheet.grouped)merge(letter(total)+'2',letter(total)+'3');
  }
  for(let j=0;j<q.length;j++){
    const c=first+j;
    put(3,c,sheet.maps[j]);if(anon)put(4,c,numeric(sheet.maximums[j]));
    if(!sheet.grouped||anon||!j||q[j]!==q[j-1]){
      put(2,c,q[j]);
      if(sheet.grouped&&!anon){let end=j;while(end+1<q.length && q[end+1]===q[j])end++;merge(letter(c)+'2',letter(first+end)+'2');}
    }
  }
  put(!anon&&sheet.grouped?3:2,total,!anon&&!sheet.grouped?'TOPLAM':'Toplam');
  if(anon&&q.length&&q.every((_,i)=>numeric(sheet.maximums[i])!==null))
    formula(4,total,'SUM(B4:'+letter(total-1)+'4)',sheet.maximums.reduce((a,v)=>a+numeric(v),0));
  for(const [i,[,title]] of extra.entries()){
    const c=total+i+1;put(2,c,title);merge(letter(c)+'2',letter(c)+'3');
  }
  if(attendance){put(2,attendance,'Katılım');if(!anon)merge(letter(attendance)+'2',letter(attendance)+'3');}
  const stats=scores(sheet);
  rows.forEach(({row,index},i)=>{
    const r=firstRow+i;
    if(anon)put(r,1,/^(0|[1-9]\d{0,12})$/.test(String(row[0]))?Number(row[0]):row[0]);
    else {put(r,1,i+1);put(r,2,String(row[0]??''));put(r,3,row[1]);}
    q.forEach((_,j)=>put(r,first+j,numeric(row[j+2])??row[j+2]));
    extra.forEach(([k],j)=>put(r,total+1+j,k===-2?(numeric(row.at(k))??row.at(k)):row.at(k)));
    if(attendance && absent.has(index))put(r,attendance,'G');
    if(q.length){
      const span=letter(first)+r+':'+letter(total-1)+r;
      const limits=q.map((_,j)=>numeric(sheet.maximums[j])??1e307);
      const tests=['COUNT('+span+')='+q.length,'MIN('+span+')>=0','SUMPRODUCT(--('+span+'>{'+limits.join(',')+'}))=0'];
      let f='IF(COUNTIF('+span+',"G")='+q.length+',"G",IF(AND('+tests.join(',')+'),SUM('+span+'),""))';
      if(attendance)f='IF('+letter(attendance)+r+'="G","G",'+f+')';
      const values=q.map((_,j)=>numeric(row[j+2]));
      const cached=absent.has(index)||markedAbsent(row)?'G':values.every((n,j)=>n!==null&&n>=0&&n<=limits[j])?values.reduce((a,b)=>a+b,0):'';
      formula(r,total,f,cached);
    }
  });
  put(footer,1,'ORTALAMA');if(!anon)merge('A'+footer,'C'+footer);
  if(rows.length)for(let c=first;c<=total;c++){
    const span=letter(c)+firstRow+':'+letter(c)+(footer-1),limit=c===total?null:numeric(sheet.maximums[c-first]);
    const criteria=['--ISNUMBER('+span+')','--('+span+'>=0)'];
    if(limit!==null)criteria.push('--('+span+'<='+limit+')');
    if(attendance)criteria.push('--('+letter(attendance)+firstRow+':'+letter(attendance)+(footer-1)+'<>"G")');
    const count='SUMPRODUCT('+criteria.join(',')+')';
    formula(footer,c,'IF('+count+'>0,SUMPRODUCT('+criteria.join(',')+','+span+')/'+count+',"")',c===total?stats.total:stats.means[c-first]);
  }
  if(!anon&&q.length&&rows.length){
    const highlight=root.insertBefore(doc.createElementNS(X,'conditionalFormatting'),all(root,'pageMargins')[0]);
    highlight.setAttribute('sqref',letter(first)+firstRow+':'+letter(total)+(footer-1));
    const rule=add(highlight,X,'cfRule');
    rule.setAttribute('type','expression');
    rule.setAttribute('dxfId',absenceStyle);
    rule.setAttribute('priority','1');
    add(rule,X,'formula').textContent='$'+letter(total)+firstRow+'="G"';
  }
  merges.setAttribute('count',direct(merges,'mergeCell').length);
  return {doc,width,footer};
}
async function workbook(zip,data){
  const wbName='xl/workbook.xml',relName='xl/_rels/workbook.xml.rels',ctName='[Content_Types].xml',styleName='xl/styles.xml';
  const [wb,rels,ct,styles]=await Promise.all([wbName,relName,ctName,styleName].map(p=>xml(zip,p)));
  const styleRoot=styles.documentElement;
  const formats=direct(styleRoot,'dxfs')[0] || styleRoot.insertBefore(styles.createElementNS(X,'dxfs'),direct(styleRoot,'tableStyles')[0]);
  const absenceStyle=direct(formats,'dxf').length;
  const fill=add(add(add(formats,X,'dxf'),X,'fill'),X,'patternFill');
  fill.setAttribute('patternType','solid');
  for(const element of ['fgColor','bgColor'])add(fill,X,element).setAttribute('rgb','FFFFFF00');
  formats.setAttribute('count',absenceStyle+1);
  const file=i=>'xl/worksheets/sheet'+i+'.xml';
  const layouts=await Promise.all([1,2,3,4].map(i=>zip.file(file(i)).async('string')));
  [1,2,3,4].forEach(i=>zip.remove(file(i)));
  const sheets=all(wb,'sheets')[0],defs=all(wb,'definedNames')[0];empty(sheets);empty(defs);
  all(rels,'Relationship').filter(e=>e.getAttribute('Type').endsWith('/worksheet')).forEach(remove);
  all(ct,'Override').filter(e=>e.getAttribute('PartName').startsWith('/xl/worksheets/')).forEach(remove);
  const used=new Set();
  const items=data.sheets.length?data.sheets:[{name:'Not Tablosu',questions:[],maps:[],maximums:[],rows:[]}];
  items.forEach((sheet,index)=>{
    const {doc,width,footer}=sheetXML(layouts[sheet.anonymous?(upper(sheet.ordinalLabel).includes('ÖĞRENCİ')?3:2):sheet.grouped?1:0],data,sheet,index,absenceStyle);
    const name=String(sheet.name||'Sınav').replace(/[\[\]*?:/\\]/g,' ').trim().replace(/^'+|'+$/g,'')||'Sınav';
    let unique=name.slice(0,31);
    for(let k=2;used.has(upper(unique));k++){const suffix=' ('+k+')';unique=name.slice(0,31-suffix.length)+suffix;}
    used.add(upper(unique));
    const id='rSheet'+(index+1),entry=add(sheets,X,'sheet');
    entry.setAttribute('name',unique);entry.setAttribute('sheetId',index+1);entry.setAttributeNS(R,'r:id',id);
    const reference="'"+unique.replaceAll("'","''")+"'!";
    for(const [name,range] of [['_xlnm.Print_Area','$A$1:$'+letter(width)+'$'+footer],['_xlnm.Print_Titles','$1:$'+(sheet.anonymous?5:3)]]){
      const definition=add(defs,X,'definedName');definition.setAttribute('name',name);definition.setAttribute('localSheetId',index);
      definition.textContent=reference+range;
    }
    const rel=add(rels.documentElement,rels.documentElement.namespaceURI,'Relationship');
    rel.setAttribute('Id',id);rel.setAttribute('Type',R+'/worksheet');rel.setAttribute('Target','worksheets/sheet'+(index+1)+'.xml');
    const type=add(ct.documentElement,ct.documentElement.namespaceURI,'Override');type.setAttribute('PartName','/'+file(index+1));type.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');
    write(zip,file(index+1),doc);
  });
  write(zip,wbName,wb);write(zip,relName,rels);write(zip,ctName,ct);write(zip,styleName,styles);
}
