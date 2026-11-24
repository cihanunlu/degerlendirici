function weightedLetters(){
 const result=new Map(),exams=[],weights=new Map();
 for(const n of names().filter(included)){
  if(course.sheets[n].anonymous)continue;
  const input=course.sheets[n].weight;
  if(input==null||String(input).trim()==='')continue;
  const weight=numeric(input);
  if(weight===null||weight<0||weight>100)return result;
  if(weight>0){exams.push(n);weights.set(n,weight)}
 }
 if(!exams.length||Math.abs(exams.reduce((v,n)=>v+weights.get(n),0)-100)>0.001)return result;
 const parts=exams.map(n=>{
  const s=course.sheets[n],max=s.questions.map((_,i)=>numeric(s.maximums?.[i]));
  if(!max.length||max.some(v=>v===null||v<=0))return null;
  const sum=max.reduce((a,b)=>a+b,0),scores=new Map(),seen=new Set();
  for(const row of s.rows){
   const id=String(row[0]??'').trim();
   if(!id)continue;
   if(seen.has(id)){scores.delete(id);continue}
   seen.add(id);
   if(rowAbsent(s,row))continue;
   const v=max.map((limit,i)=>validQuestionScore(row[i+2],limit));
   if(v.includes(null))continue;
   scores.set(id,v.reduce((a,b)=>a+b,0)*weights.get(n)/sum);
  }
  return scores;
 });
 if(parts.some(p=>!p))return result;
 for(const id of parts[0].keys())if(parts.every(p=>p.has(id)))result.set(id,letterOf(parts.reduce((a,p)=>a+p.get(id),0),''));
 return result;
}
function reportDefaults(){
 return {intro:course.reportIntro??'',report:course.report??'',actions:course.actions??''};
}
function reportEvidence(){
 const outcomes=currentOutcomes();
 const outcomeList=outcomes.length
  ? '<dl class="evidence-outcomes">'+outcomes.map(o=>'<dt>ÖÇ '+esc(o.number)+'</dt><dd>'+esc(o.text)+'</dd>').join('')+'</dl>'
  : '<p>Bu ders için ana öğrenme çıktısı girilmedi.</p>';
 return '<section class="report-evidence" aria-label="Rapor için veriler"><h3>Rapor için veriler</h3>'+
  '<details><summary>Ana öğrenme çıktıları ('+outcomes.length+')</summary>'+outcomeList+'</details>'+
  examStats()+'<details><summary>Harf notu dağılımı</summary>'+chartPair()+'</details></section>';
}
function chartPair(){
 const {counts,total,conflicts}=dist();if(!total)return chart();
 const colors=['#cbe6ce','#fff4b6','#d3e1e6','#f4c3c3','#bcebe4','#a6d4f3','#cfc3e6','#ffd8bf','#d1d1d1'];
 const values=Array.from(counts),max=Math.max(1,...values.map(([,v])=>v));let end=0;
 const stops=values.map(([,v],i)=>{const start=end;end+=100*v/total;return colors[i%colors.length]+' '+start+'% '+end+'%'}).join(', ');
 return '<h3>Harf notu dağılımı</h3><p>'+total+' öğrenci'+(conflicts?' · Çelişen dönem sonu notu bulunan '+conflicts+' öğrenci hesap dışında.':'')+'</p><div class="both-charts"><figure><figcaption>Sütun grafiği</figcaption><div class="vertical-bars">'+values.map(([k,v],i)=>'<div><b>'+v+'</b><span style="height:'+Math.max(v?2:0,88*v/max)+'px;background:'+colors[i%colors.length]+'"></span><small>'+esc(k)+'</small></div>').join('')+'</div></figure><figure><figcaption>Pasta grafiği</figcaption><div class="grade-pie" style="background:conic-gradient('+stops+')"></div><div class="pie-legend">'+values.map(([k,v],i)=>'<span><i style="background:'+colors[i%colors.length]+'"></i>'+esc(k)+' '+v+' ('+gradePercent(v,total)+')</span>').join('')+'</div></figure></div>';
}
async function componentDownload(index){
 const data=exportData(),files=course.files[index],entries=[];
 const native=index===0?['cover-pdf','pdf']:index===4&&data.sheets.length?['xlsx','xlsx']:index===5&&(data.sheets.length||course.report)?['report','docx']:null;
 const base=index+'. '+packageNames[index];
 if(native)entries.push([base+'.'+native[1],await nativeFile(native[0],data)]);
 for(const [j,file] of files.entries())entries.push([index>=6?sectionFilenames(index)[j]:file.name,file]);
 if(index===3&&dist().total)for(const [kind,title] of [['chart','Pasta'],['bars','Sütun']])entries.push(['Harf Notu Dağılımı - '+title+'.png',await nativeFile(kind,data)]);
 if(!entries.length){notify('Bu bölüm için önce bir belge ekleyin.');return}
 if(entries.length===1){download(entries[0][1],entries[0][0]);return}
 const z=new JSZip();
 for(const [name,file] of entries){let key=name,i=2;while(z.file(key))key=i+++' - '+name;z.file(key,await file.arrayBuffer())}
 download(await z.generateAsync({type:'blob',compression:'DEFLATE'}),base+'.zip');
}
