import { strToU8, zipSync } from "fflate";

export const sections = [
  "Dosya Kapağı ve Belgeler Listesi", "Ders İzlencesi", "Öğrenci Devam Çizelgesi",
  "Harf Notları ve İstatistikler", "Faaliyet ve Not Tablosu", "Ders Değerlendirme Raporu",
  "Cevap Anahtarları", "Öğrenci Faaliyet Örnekleri"
];
export const present = (c,i) => i === 0 || c.files.some(f=>f.section===i) ||
  (i===4 && !!c.scores) || (i===5 && !!c.report);
export function filename(value) {
  const name=value.replace(/[<>:"/\\|?*\x00-\x1f]/g,"_").slice(0,130).replace(/[ .]+$/,"");
  return !name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name) ? "_"+name : name;
}
const xml = v => String(v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const office = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const types = "http://schemas.openxmlformats.org/package/2006/content-types";
function relationships(links) {
  return '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+links.map(([id,type,target])=>'<Relationship Id="'+id+'" Type="'+office+'/'+type+'" Target="'+target+'"/>').join("")+'</Relationships>';
}
function archive(entries){
  return zipSync(Object.fromEntries(Object.entries(entries).map(([p,t])=>[p,typeof t==="string"?strToU8(t):t])),{level:4});
}
function contentTypes(parts){
  return '<Types xmlns="'+types+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+parts.map(([p,t])=>'<Override PartName="/'+p+'" ContentType="application/vnd.openxmlformats-officedocument.'+t+'+xml"/>').join("")+'</Types>';
}
function word(lines){
  const content=lines.map(([text,bold])=>'<w:p><w:r>'+(bold?'<w:rPr><w:b/></w:rPr>':'')+'<w:t xml:space="preserve">'+xml(text)+'</w:t></w:r></w:p>').join("");
  return archive({"[Content_Types].xml":contentTypes([["word/document.xml","wordprocessingml.document.main"]]),"_rels/.rels":relationships([["r1","officeDocument","word/document.xml"]]),"word/document.xml":'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+content+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:bottom="1300" w:left="1400" w:right="1400"/></w:sectPr></w:body></w:document>'});
}
export function parseScores(text){
  const rows=text.trim().split(/\r?\n/).map(line=>line.split('\t').map(x=>x.trim()));
  const size=rows[0].length;
  if(size<3 || size>202 || rows.length<2 || rows[0].some(x=>!x)) throw Error("Başlık satırını, öğrenci numarası ve adıyla birlikte en az bir soru sütununu ekleyin.");
  const seen=new Set();
  for(const [i,r] of rows.slice(1).entries()){
    if(!r[0] || !r[1] || seen.has(r[0]) || r.length!==size) throw Error((i+2)+". satırdaki öğrenci numarasını, adı ve sütun sayısını kontrol edin.");
    seen.add(r[0]);
    const values=r.slice(2);
    if(values.every(x=>x.toUpperCase()==="G")){r.fill("G",2);continue;}
    if(values.some(x=>!/^\d+(?:[,.]\d+)?$/.test(x)||!Number.isFinite(Number(x.replace(",","."))))) throw Error((i+2)+". satırda her soru için puan veya tüm sorular için G girin.");
    for(let j=2;j<size;j++)r[j]=Number(r[j].replace(",","."));
  }
  return rows;
}
function column(n){let s="";while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function workbook(text){
  const [head,...rows]=parseScores(text);
  const attendees=rows.filter(r=>r[2]!=="G");
  const records=rows.map(r=>[...r,r[2]==="G"?"G":r.slice(2).reduce((a,b)=>a+b,0)]);
  const avgs=head.slice(2).map((_,j)=>attendees.length?attendees.reduce((sum,r)=>sum+r[j+2],0)/attendees.length:"");
  const matrix=[[...head,"Toplam"],...records,["ORTALAMA","",...avgs,attendees.length?avgs.reduce((a,b)=>a+b,0):""]];
  const sheet=matrix.map((r,i)=>'<row r="'+(i+1)+'">'+r.map((value,j)=>{
    const col=column(j+1),ref=col+(i+1);
    if(i===matrix.length-1 && j>=2)return '<c r="'+ref+'"'+(value===""?' t="str"':'')+'><f>IF(COUNT('+col+'2:'+col+(i)+')=0,"",AVERAGE('+col+'2:'+col+i+'))</f><v>'+value+'</v></c>';
    if(i>0 && i<matrix.length-1 && j===head.length)return '<c r="'+ref+'"'+(value==="G"?' t="str"':'')+'><f>IF(COUNT(C'+(i+1)+':'+column(j)+(i+1)+')=0,"G",SUM(C'+(i+1)+':'+column(j)+(i+1)+'))</f><v>'+value+'</v></c>';
    return typeof value==="number"?'<c r="'+ref+'"><v>'+value+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t>'+xml(value)+'</t></is></c>';
  }).join("")+'</row>').join("");
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  return archive({"[Content_Types].xml":contentTypes([["xl/workbook.xml","spreadsheetml.sheet.main"],["xl/worksheets/sheet1.xml","spreadsheetml.worksheet"]]),"_rels/.rels":relationships([["r1","officeDocument","xl/workbook.xml"]]),"xl/workbook.xml":'<workbook xmlns="'+ns+'" xmlns:r="'+office+'"><sheets><sheet name="Puanlar" sheetId="1" r:id="r1"/></sheets></workbook>',"xl/_rels/workbook.xml.rels":relationships([["r1","worksheet","worksheets/sheet1.xml"]]),"xl/worksheets/sheet1.xml":'<worksheet xmlns="'+ns+'"><cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/></cols><sheetData>'+sheet+'</sheetData></worksheet>'});
}
export async function packageCourse(c){
  const info=[[c.title,true],[[c.code,c.year,c.term].filter(Boolean).join(" · ")],[c.teacher]];
  const entries={"01 - Dosya Kapağı.docx":word([["Ders Değerlendirme Dosyası",true],...info,["Belgeler Listesi",true],...sections.map((s,i)=>[(present(c,i)?"[x] ":"[ ] ")+s])])};
  if(c.scores)entries["05 - Not Tablosu.xlsx"]=workbook(c.scores);
  if(c.report)entries["06 - Ders Değerlendirme Raporu.docx"]=word([["Ders Değerlendirme Raporu",true],...info,...c.report.split(/\r?\n/).map(line=>[line])]);
  for(const [i,f] of c.files.entries()){
    const folder=String(f.section+1).padStart(2,"0")+" - "+sections[f.section];
    entries[folder+"/"+String(i+1).padStart(3,"0")+" - "+filename(f.file.name)]=new Uint8Array(await f.file.arrayBuffer());
  }
  return new Blob([archive(entries)],{type:"application/zip"});
}
