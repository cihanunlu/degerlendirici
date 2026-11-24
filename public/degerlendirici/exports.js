const activityNames=['Ara Sınavlar','Kısa Sınavlar','Ödevler','Dönem Ödevi','Proje','Deney Raporları','Diğer','Final Sınavı'];
const packageNames=['Dosya Kapağı','Ders İzlencesi','Öğrenci Devam Çizelgesi','Dönem Sonu Harf Notu Çıktısı','Not Tablosu','Ders Değerlendirme Raporu','Cevap Anahtarları','Öğrenci Faaliyetlerine Ait Örnekler'];
function exportData(){
 const activities=inferredActivities();
 const ranges=Object.fromEntries(scale().map(([key,min],i)=>[key,key+'('+min+'-'+(i?scale()[i-1][1]-1:100)+')']));
 return {code:course.code,name:course.name,...parseTerm(course.term),teacher:teacherName(course),coverTeacher:teacherName(course,true),present:sections.map((_,i)=>Boolean(populated(i)||i===0||i===5&&names().length)),activities,otherActivity:activities[6]?(course.otherActivity||''):'',...reportDefaults(),outcomes:currentOutcomes(),counts:Array.from(dist().counts),ranges,sheets:names().map(n=>{let s=course.sheets[n];return {...s,absentRows:s.rows.flatMap((r,i)=>rowAbsent(s,r)?[i]:[]),name:n,include:included(n),grouped:Boolean(s.grouped),maximums:s.questions.map((_,i)=>s.maximums?.[i]??'')}})};
}
async function nativeFile(kind,data=exportData()){
 return (await import('./web-exports.mjs')).webNativeFile(kind,data);
}
async function nativeDownload(kind,filename){try{notify('Şablon hazırlanıyor…');download(await nativeFile(kind),filename);notify('Dosya hazır.')}catch(e){window.alert(e.message)}}
async function exportGrades(csv){
 await collectGrades();
 if(csv && typeof XLSX==='undefined') await loadLibrary('XLSX');
 if(csv){download(new Blob(['\ufeff',XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(dataRows(course.sheets[activeSheet])))],{type:'text/csv;charset=utf-8'}),course.code+'-'+activeSheet+'.csv');return}
 await nativeDownload('xlsx','4. Not Tablosu.xlsx');
}
function coverView(){
 const activities=inferredActivities();
 const boxes=[0,1,2,3,4,5,7,6].map(i=>'<label><input type="checkbox" name="activity" value="'+i+'" '+(activities[i]?'checked':'')+'> '+activityNames[i]+'</label>').join('');
 dialog('Dosya kapağı','<p>'+esc(course.code+' · '+course.name)+'<br>'+esc([course.term,teacherName(course,true)].filter(Boolean).join(' · '))+'</p><fieldset><legend>Öğrenci faaliyet örnekleri</legend>'+boxes+'<label id="otherActivityField"'+(activities[6]?'':' hidden')+'>Diğer faaliyet açıklaması<input id="otherActivityText" maxlength="200" value="'+esc(course.otherActivity||'')+'"></label></fieldset><div class="actions">'+btn('PDF indir','downloadCover("cover-pdf")'.replaceAll('"',"'"),'download')+btn('Word indir',"downloadCover('cover-docx')",'download')+btn('Kapağı pakete ekle','useCover()','check')+'</div>');
 const other=document.querySelector('input[name="activity"][value="6"]');
 other.onchange=()=>{
  $('otherActivityField').hidden=!other.checked;
  if(other.checked)$('otherActivityText').focus();
 };
}
function activityChoices(){
 const previous=inferredActivities();
 for(const input of document.querySelectorAll('input[name="activity"]')){
  const index=Number(input.value);
  if(input.checked!==previous[index])(course.activityOverrides??={})[index]=input.checked;
 }
 course.otherActivity=$('otherActivityText').value.trim();
}
async function downloadCover(kind){activityChoices();await persist();await nativeDownload(kind,'0. Dosya Kapağı.'+(kind==='cover-pdf'?'pdf':'docx'))}
async function useCover(){activityChoices();course.cover=true;course.done[0]=true;await save();modal.close()}
function reportView(){
 const draft=reportDefaults();
 dialog('Ders değerlendirme raporu',reportEvidence()+
  '<label>Giriş ve değerlendirme ölçütleri<textarea id="intro" placeholder="Örneğin: Bu derste öğrenci başarısını … ile değerlendirdim.">'+esc(draft.intro)+'</textarea></label>'+
  '<label>Değerlendirme <span class="muted">(pakete eklemek için gerekli)</span><textarea id="comment" placeholder="Örneğin: Öğrenciler … konusunda başarılı oldu. … sorusunda ise zorlandılar." oninput="this.setCustomValidity(\'\')">'+esc(draft.report)+'</textarea></label>'+
  '<label>Başarının artırılması için yapılacak iş ve işlemler<textarea id="actions" placeholder="Örneğin: Gelecek dönem … konusuna daha fazla uygulama süresi ayıracağım.">'+esc(draft.actions)+'</textarea></label>'+
  '<div class="actions">'+btn('Word indir','downloadReport()','download')+btn('Raporu pakete ekle','saveReport()','check')+'</div>');
}
function readReport(){course.reportIntro=$('intro').value.trim();course.report=$('comment').value.trim();course.actions=$('actions').value.trim()}
async function downloadReport(){readReport();await persist();await nativeDownload('report','5. Ders Değerlendirme Raporu.docx')}
async function saveReport(){
 const comment=$('comment');
 comment.setCustomValidity(comment.value.trim()?'':'Raporu pakete eklemek için değerlendirmeyi girin.');
 if(!comment.reportValidity())return;
 readReport();course.done[5]=true;await save();modal.close();
}
async function makeZip(){
 const button=Array.from(document.querySelectorAll("#modalbody button")).at(-1);
 if(button?.disabled)return;
 if(button){button.disabled=true;button.textContent='Belgeler hazırlanıyor…'}
 try{
  const z=new JSZip(),data=exportData(),files=course.files.map(group=>group.slice());
  const generated=new Map(),jobs=[];
  if(course.cover||(!files[0].length&&data.sheets.length))generated.set(0,['cover-pdf','pdf']);
  if(data.sheets.length){
   generated.set(4,['xlsx','xlsx']);
  }
  if(course.report||(!files[5].length&&data.sheets.length))generated.set(5,['report','docx']);
  for(const [i,[kind,ext]] of generated)jobs.push([kind,i+'. '+packageNames[i]+'.'+ext,data]);
  if(data.counts.some(([,n])=>n>0)){
   const chartData={counts:data.counts,ranges:data.ranges};
   jobs.push(['chart','3. Harf Notu Dağılımı - Pasta.png',chartData],['bars','3. Harf Notu Dağılımı - Sütun.png',chartData]);
  }
  const attachments=files.flatMap((group,i)=>{
   const base=i+'. '+packageNames[i];
   const classified=i===6||i===7?sectionFilenames(i,group):null;
   return group.map((f,j)=>{
    const ext=f.name.includes('.')?'.'+f.name.split('.').pop():'';
    const entry=classified?base+'/'+classified[j]:group.length===1&&!generated.has(i)?base+ext:base+'/'+(j+1)+'. '+safePart(f.name);
    return [entry,f,i===7?course.fileTags?.[7]?.[j]:null];
   });
  });
  // Word, Excel and chart rendering are independent local jobs.
  const results=await Promise.allSettled(jobs.map(async ([kind,entry,payload])=>
   [entry,await (await nativeFile(kind,payload)).arrayBuffer()]));
  for(const result of results){
   if(result.status==='rejected')throw result.reason;
   z.file(...result.value);
  }
  for(const [entry,f,tag] of attachments){
   try{z.file(entry,await activityPackageBytes(f,tag))}
   catch(error){throw new Error(f.name+' paketlenemedi. '+error.message)}
  }
  const filename=safePart(data.name)+' - Ders Değerlendirme Dosyası.zip';
  const zip=await z.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},({percent})=>{
   if(button)button.textContent='Sıkıştırılıyor · %'+Math.round(percent);
  });
  download(zip,filename);
  if(button?.isConnected)modal.close();
 }catch(e){
  window.alert(e.message);
  if(button?.isConnected){button.disabled=false;button.textContent='ZIP indirmeyi yeniden dene'}
 }
}
