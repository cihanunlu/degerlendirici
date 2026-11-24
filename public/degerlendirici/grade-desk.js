function validQuestionScore(value, maximum){
 const score=numeric(value),limit=numeric(maximum);
 return score!==null && score>=0 && (limit===null || score<=limit) ? score : null;
}
function sheetTotals(row,s){
 if(s.anonymous){
  const values=s.questions.map((_,i)=>String(row[i+2]??'').trim().toUpperCase());
  if(values.includes('G')){
   return values.every(v=>!v||v==='G')?'G':'Puan ve G kaydı var';
  }
 }
 let total=0,entered=0;
 for(let i=0;i<s.questions.length;i++){
  const value=row[i+2];
  if(value==null||String(value).trim()==='')continue;
  const score=validQuestionScore(value,s.maximums?.[i]);
  if(score===null)return (i+1)+'. puanı kontrol edin';
  entered++;
  total+=score;
 }
 if(!entered)return '—';
 if(entered<s.questions.length)return entered+'/'+s.questions.length+' girildi';
 return total.toLocaleString('tr-TR',{maximumFractionDigits:2});
}
function gradeSettings(s){
 const count='<div class="exam-question-count"><label>Soru sayısı<input id="examQuestions" type="number" required min="'+(s.anonymous?1:0)+'" max="'+Math.max(100,s.questions.length)+'" value="'+s.questions.length+'"></label>'+btn('Uygula','applyQuestionCount()').replace('<button','<button aria-label="Soru sayısını uygula"')+'</div>';
 const weight=s.anonymous?'':'<label>Dönem sonu notundaki ağırlık (%)<input id="examWeight" type="number" min="0" max="100" step="any" aria-describedby="examWeightHelp" value="'+esc(s.weight??'')+'"></label>';
 const weightHelp=s.anonymous?'':'<p id="examWeightHelp">Tam puanları ve toplamı %100 olan sınav ağırlıklarını girerseniz dönem sonu harfleri hesaplanır. OBS harf notları önceliklidir.</p>';
 const questions=s.questions.map((q,i)=>'<fieldset><legend>'+esc(q)+'</legend><label>ÖÇ<input list="oclist" data-map="'+i+'" value="'+esc(s.maps[i])+'"></label><label>Tam puan<input type="number" step="any" min="0" data-max="'+i+'" value="'+esc(s.maximums?.[i]??'')+'"></label></fieldset>').join('');
 return '<details id="examSettings" class="exam-settings"><summary>'+icon('sliders-horizontal')+' Sınav ve soru ayarları</summary><div class="exam-settings-body"><div class="exam-setting-controls">'+count+weight+'<label class="exam-inclusion"><input type="checkbox" id="include" '+(included(activeSheet)?'checked':'')+'> Rapor istatistiklerine kat</label></div><p id="questionCountMessage" role="status"></p>'+weightHelp+(questions?'<div class="setting-grid">'+questions+'</div>':'')+'</div><datalist id="oclist">'+currentOutcomes().map(o=>'<option value="ÖÇ '+o.number+'">'+esc(o.text)+'</option>').join('')+'</datalist></details>';
}
let removingManagedExam=false;
function examManager(){
 const list=names().map((name,i)=>{
  const sheet=course.sheets[name],count=sheet.questions.length;
  return '<li class="file"><div class="file-name"><strong>'+esc(name)+'</strong><span class="sub">'+count+' soru · '+(included(name)?'Rapora dahil':'Rapor dışında')+'</span></div><div class="file-actions">'+btn('Ayarlar','openManagedExam('+i+',true)','sliders-horizontal')+btn('Puanları aç','openManagedExam('+i+',false)','sheet')+btn('Kaldır','removeManagedExam('+i+')','trash-2').replace('<button','<button class="exam-remove" aria-label="'+esc(name+' sınavını kaldır')+'"')+'</div></li>';
 }).join('');
 dialog('Sınavlar','<p>'+esc(course.code+' · '+course.name)+'</p>'+(list?'<ul aria-label="Tanımlı sınavlar" style="padding:0">'+list+'</ul>':'<p>Bu ders için henüz sınav tanımlanmadı.</p>')+'<div class="actions">'+btn('Sınav tanımla','newSheet()','plus')+'</div>');
}
function removeManagedExam(index){
 const name=names()[index];
 if(name===undefined||removingManagedExam)return;
 const owner=course;
 const sameExam=activity=>activity&&filingKey(activity)===filingKey(name);
 const shared=names().some(other=>other!==name&&sameExam(other));
 const groups=shared?[]:[6,7].filter(group=>course.fileTags?.[group]?.some(tag=>sameExam(tag?.activity)));
 const linked=groups.length?'<p>Yüklenen belgeler saklanacak ve bu sınava ait belge eşleştirmeleri kaldırılacak.</p>':'';
 dialog('Sınavı kaldır','<p><strong>'+esc(name)+'</strong> sınavı, soru ayarları ve puanları kalıcı olarak silinecek.</p>'+linked+'<p id="removeExamError" role="status"></p><div class="actions"><button type="button" id="removeExamCancel" onclick="examManager()">Vazgeç</button><button type="button" id="removeExamConfirm" class="exam-remove">Sınavı kaldır</button></div>');
 $('removeExamCancel').focus();
 const confirm=$('removeExamConfirm');
 confirm.onclick=async()=>{
  if(removingManagedExam||course!==owner||!Object.hasOwn(course.sheets,name))return;
  removingManagedExam=true;confirm.disabled=true;
  try{
   await collectGrades();
   if(course!==owner)return;
   const sheets=course.sheets,tags=course.fileTags,done=course.done;
   const remaining={...sheets};delete remaining[name];
   course.sheets=remaining;
   course.done=[...done];
   for(const group of [3,4,5,...groups])course.done[group]=false;
   if(groups.length){
    course.fileTags={...tags};
    for(const group of groups)course.fileTags[group]=tags[group].map(tag=>sameExam(tag?.activity)?null:tag);
   }
   try{
    await persist();
   }catch(error){
    owner.sheets=sheets;owner.fileTags=tags;owner.done=done;
    throw error;
   }
   if(course!==owner)return;
   for(const group of groups){
    const selected=selectedFiling(group);
    if(selected.startsWith('activity:')&&sameExam(selected.slice(9)))filingFilters.delete(course.id+'|'+group);
   }
   if(activeSheet===name){activeSheet='';gradeSearch=''}
   const showManager=modal.open&&confirm.isConnected;
   render();
   if(!$('gradePage').hidden)grades();
   if(showManager)examManager();
  }catch{
   const message=$('removeExamError');
   if(message)message.textContent='Yerel depolamaya yazılamadı. Sınav saklanıyor.';
  }finally{
   removingManagedExam=false;confirm.disabled=false;
  }
 };
}
function showExamSettings(){
 const details=$('examSettings');if(!details)return;
 details.open=true;
 details.querySelector('summary').focus();
}
function openManagedExam(index,settings){
 activeSheet=names()[index];gradeSearch='';gradeMode='scores';grades();
 if(settings)showExamSettings();
}
function questionRemovalMessage(sheet,name,count){
 const removed=sheet.questions.slice(count);
 if(!removed.length)return '';
 const hasValue=v=>v!=null&&String(v).trim()!=='';
 if(sheet.rows.some(row=>row.slice(count+2,sheet.questions.length+2).some(hasValue))){
  return 'Kaldırılacak sorularda puan kaydı var. Soru sayısını azaltmadan önce bu puanları kontrol edin.';
 }
 const linked=(course.fileTags?.[6]||[]).some(tag=>tag&&norm(prettyExam(tag.activity))===norm(prettyExam(name))&&tag.questions?.some(q=>removed.includes(q)));
 if(linked)return 'Kaldırılacak sorulardan biri cevap anahtarına bağlı. Önce belgenin soru eşleştirmesini güncelleyin.';
 return '';
}
async function applyQuestionCount(){
 const field=$('examQuestions'),note=$('questionCountMessage'),count=field.valueAsNumber;
 if(!field.reportValidity())return;
 const sheet=course.sheets[activeSheet],old=sheet.questions.length;
 if(count===old){note.textContent='Soru sayısı aynı.';return}
 const warning=questionRemovalMessage(sheet,activeSheet,count);
 if(warning){note.textContent=warning;return}
 const hasSettings=[...(sheet.maps||[]).slice(count),...(sheet.maximums||[]).slice(count)].some(v=>v!=null&&String(v).trim()!=='');
 if(count<old&&hasSettings&&!window.confirm('Son '+(old-count)+' sorunun ÖÇ eşleştirmeleri ve tam puanları kaldırılacak. Soru sayısı azaltılsın mı?'))return;
 const keep=(list,make)=>Array.from({length:count},(_,i)=>i<old?(list?.[i]??make(i)):make(i));
 sheet.questions=keep(sheet.questions,i=>(i+1)+'. Soru');
 sheet.maps=keep(sheet.maps,()=>'');sheet.maximums=keep(sheet.maximums,()=>'');
 sheet.rows=sheet.rows.map(row=>{
  const updated=[row[0]??'',row[1]??'',...keep(row.slice(2,2+old),()=>''),row[2+old]??'',row[3+old]??''];
  if(typeof row.absent==='boolean')updated.absent=row.absent;
  return updated;
 });
 markGradeEdit(false);await flushGradeEdits();grades();showExamSettings();$('questionCountMessage').textContent=count+' soru kaydedildi.';
}
let gradeMode='scores',gradeSearch='',gradeFirstQuestion=0,gradeGridSheet,gradeLayout,gradeResize;
let gradeSaveTimer,gradeEdit,gradeWrite;
function gradeSaveStatus(message){
 const status=$('gradeSaved');
 if(status&&status.textContent!==message)status.textContent=message;
}
function markGradeEdit(debounce=true){
 course.done[4]=false;
 gradeEdit={owner:course,pending:true};
 gradeSaveStatus('Kaydediliyor…');
 if(gradeSaveTimer!==undefined)clearTimeout(gradeSaveTimer);
 if(debounce)gradeSaveTimer=setTimeout(savePendingGrades,350);
}
function flushGradeEdits(){
 const edit=gradeEdit;
 if(!edit||edit.owner!==course)return;
 if(!edit.pending)return gradeWrite;
 if(gradeSaveTimer!==undefined){clearTimeout(gradeSaveTimer);gradeSaveTimer=undefined}
 edit.pending=false;
 gradeWrite=save().then(()=>{
  if(gradeEdit===edit){gradeEdit=null;gradeSaveStatus('Kaydedildi')}
 }).catch(error=>{
  if(gradeEdit===edit){edit.pending=true;gradeSaveStatus('Kaydedilemedi')}
  throw error;
 });
 return gradeWrite;
}
function savePendingGrades(){flushGradeEdits()?.catch(()=>{})}
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)savePendingGrades()});
globalThis.addEventListener?.('pagehide',savePendingGrades);
function gradeColumns(s){
 if(s.anonymous)return [0,...s.questions.map((_,i)=>i+2)];
 return gradeMode==='scores'&&s.questions.length?[0,1,...s.questions.map((_,i)=>i+2)]:[0,1,s.questions.length+2,s.questions.length+3];
}
function gradeGridLayout(s,width){
 const scores=gradeMode==='scores'&&s.questions.length>0;
 const stacked=!s.anonymous&&width<655;
 const compactAttendance=width<655,attendance=compactAttendance?0:47;
 const identity=s.anonymous?64:stacked?Math.min(174,width*.42):Math.min(250,width*.30);
 const sum=scores?Math.min(69,Math.max(46,width*.105)):0;
 const columnMinimum=width>=840?44:width<450?59:66;
 const capacity=Math.max(1,Math.floor((width-identity-sum-attendance-18)/columnMinimum));
 const size=Math.min(s.questions.length||1,capacity);
 const start=Math.min(Math.floor(gradeFirstQuestion/size)*size,Math.max(0,Math.floor((s.questions.length-1)/size)*size));
 const columns=scores?Array.from({length:Math.min(size,s.questions.length-start)},(_,i)=>start+i+2):gradeColumns(s).filter(i=>i>=2);
 return {scores,stacked,identity,sum,size,start,columns,attendance,compactAttendance};
}
function gradeAveragesFooter(s,l){
 if(!l.scores)return '';
 const result=examAverages(s);
 const identity=(l.stacked||s.anonymous?1:2)+(l.compactAttendance?0:1);
 const cell=(stats,label,total=false)=>{
  const value=stats.mean==null?'—':stats.mean.toLocaleString('tr-TR',{maximumFractionDigits:2});
  const description=label+' · '+value+' · '+stats.count+' geçerli kayıt';
  return '<td title="'+esc(description)+'" aria-label="'+esc(description)+'">'+(total?'<small>Sınav ort.</small>':'')+value+'</td>';
 };
 return '<tr><th scope="row" colspan="'+identity+'">Ortalama</th>'+l.columns.map(j=>cell(result.questions[j-2],s.questions[j-2])).join('')+cell(result.total,'Sınav ortalaması',true)+'</tr>';
}
function updateGradeAverages(s){
 const footer=$('examAverages');
 if(footer&&gradeLayout?.scores)footer.innerHTML=gradeAveragesFooter(s,gradeLayout);
}
function examRowTotal(sheet,row){
 if(!rowAbsent(sheet,row))return sheetTotals(row,sheet);
 const scores=row.slice(2,2+sheet.questions.length);
 if(scores.some(isAbsentMark)&&scores.some(v=>numeric(v)!==null))return 'Puan ve G kaydı var';
 return 'Katılmadı';
}
function gradeGridMarkup(s,l){
 const labels=headers(s);
 const text=(i,j)=>'<input autocomplete="off" '+(j>=2&&j<=s.questions.length+2?'inputmode="decimal" ':'')+'aria-label="'+esc(labels[j]+', satır '+(i+1))+'" data-row="'+i+'" data-col="'+j+'" value="'+esc(s.rows[i][j])+'">';
 const combined=l.stacked||s.anonymous;
 const identityColumns=(l.compactAttendance?'':'<col style="width:'+l.attendance+'px">')+(combined?'<col style="width:'+l.identity+'px">':'<col style="width:'+Math.round(l.identity*.38)+'px"><col style="width:'+Math.round(l.identity*.62)+'px">');
 const head=(l.compactAttendance?'':'<th scope="col" class="participation-head">Katıldı</th>')+'<th scope="col">'+(s.anonymous?'Sıra No':l.stacked?'Öğrenci':'Öğrenci No')+'</th>'+(combined?'':'<th scope="col">Ad Soyad</th>');
 const scoreHead=l.columns.map(j=>{
  const mapping=l.scores?s.maps?.[j-2]:'';
  const max=l.scores?s.maximums?.[j-2]:null;
  const limit=max==null||String(max).trim()===''?'':max+' puan';
  const meta=[mapping,limit].filter(Boolean).join(' · ');
  const standard=l.scores&&String(labels[j]).match(/^(?:(\d+)\.?\s*soru|soru\s*(\d+))$/iu);
  const short=standard?'S'+(standard[1]||standard[2]):labels[j];
  const description=[labels[j],meta].filter(Boolean).join(' · ');
  return '<th scope="col" title="'+esc(description)+'" aria-label="'+esc(description)+'">'+esc(short)+(mapping?'<small>'+esc(mapping)+'</small>':'')+(limit?'<small class="'+(limit.length<=8?'grade-limit':'')+'">'+esc(limit)+'</small>':'')+'</th>';
 }).join('');
 const body=s.rows.map((r,i)=>{
  const absent=rowAbsent(s,r),label=(s.anonymous?'Sıra '+r[0]:r[1]||r[0])||'Satır '+(i+1);
  const check='<label class="participation-control" title="'+esc(label+' · Sınava katıldı')+'"><input type="checkbox" data-attendance="'+i+'" aria-label="'+esc(label+' · Sınava katıldı')+'" '+(absent?'':'checked')+'>'+(l.compactAttendance?'<span>Katıldı</span>':'')+'</label>';
  const identity='<td class="grade-identity">'+text(i,0)+(l.stacked?text(i,1):'')+(l.compactAttendance?check:'')+'</td>'+(combined?'':'<td class="grade-identity">'+text(i,1)+'</td>');
  return '<tr data-student="'+i+'" class="'+(absent?'exam-absent':'')+'">'+(l.compactAttendance?'':'<td class="participation-cell">'+check+'</td>')+identity+l.columns.map(j=>'<td>'+text(i,j)+'</td>').join('')+(l.scores?'<td class="sumcell">'+examRowTotal(s,r)+'</td>':'')+'</tr>';
 }).join('');
 const table='<div class="grade-scroll"><table class="grade-table"><colgroup>'+identityColumns+l.columns.map(()=>'<col>').join('')+(l.scores?'<col style="width:'+l.sum+'px">':'')+'</colgroup><thead><tr>'+head+scoreHead+(l.scores?'<th scope="col">Toplam</th>':'')+'</tr></thead><tbody>'+body+'</tbody>'+(l.scores?'<tfoot id="examAverages">'+gradeAveragesFooter(s,l)+'</tfoot>':'')+'</table></div>';
 if(!l.scores||l.size>=s.questions.length)return table;
 const pages=Math.ceil(s.questions.length/l.size),current=Math.floor(l.start/l.size);
 const options=Array.from({length:pages},(_,p)=>{
  const a=p*l.size+1,b=Math.min((p+1)*l.size,s.questions.length);
  return '<option value="'+(a-1)+'" '+(current===p?'selected':'')+'>'+(a===b?a:a+'–'+b)+' / '+s.questions.length+'</option>';
 }).join('');
 return '<nav class="question-pager" aria-label="Soru sütunları"><button type="button" aria-label="Önceki sorular" onclick="showQuestionGroup('+(l.start-l.size)+')" '+(!current?'disabled':'')+'>‹</button><label>Sorular<select aria-label="Gösterilen sorular" onchange="showQuestionGroup(Number(this.value))">'+options+'</select></label><button type="button" aria-label="Sonraki sorular" onclick="showQuestionGroup('+(l.start+l.size)+')" '+(current===pages-1?'disabled':'')+'>›</button></nav>'+table;
}
function refreshGradeGrid(keepFocus=false){
 const holder=$('gradeGrid'),s=course.sheets[activeSheet];if(!holder||!s)return;
 const width=holder.clientWidth||640,next=gradeGridLayout(s,width);
 const gridChanged=!gradeLayout||next.stacked!==gradeLayout.stacked||next.compactAttendance!==gradeLayout.compactAttendance||next.start!==gradeLayout.start||next.size!==gradeLayout.size;
 if(keepFocus&&!gridChanged)return;
 const focused=holder.contains(document.activeElement)?document.activeElement:null;
 const active=focused?.hasAttribute('data-row')?{r:+focused.dataset.row,c:+focused.dataset.col,start:focused.selectionStart,end:focused.selectionEnd}:null;
 if(keepFocus&&active&&next.scores&&active.c>=2){gradeFirstQuestion=active.c-2;Object.assign(next,gradeGridLayout(s,width))}
 const scroll=holder.querySelector('.grade-scroll')?.scrollTop||0;
 focused?.blur();
 gradeLayout=next;gradeFirstQuestion=next.start;holder.innerHTML=gradeGridMarkup(s,next);
 filterStudents();holder.querySelector('.grade-scroll').scrollTop=scroll;
 if(keepFocus&&active){
  const input=holder.querySelector('[data-row="'+active.r+'"][data-col="'+active.c+'"]');
  input?.focus({preventScroll:true});input?.setSelectionRange(active.start,active.end);
 }
}
function showQuestionGroup(first){
 gradeFirstQuestion=Math.max(0,first);refreshGradeGrid();
 $('gradeGrid')?.querySelector('.question-pager select')?.focus({preventScroll:true});
}
function filterStudents(){
 const s=course.sheets[activeSheet];gradeSearch=$('studentSearch').value;
 let visible=0;
 const query=norm(gradeSearch.trim());
 for(const row of $('gradeDesk').querySelectorAll('[data-student]')){
  const record=s.rows[+row.dataset.student];row.hidden=Boolean(query)&&!norm(record.slice(0,2).join(' ')).includes(query);if(!row.hidden)visible++;
 }
 $('studentCount').textContent=visible+' / '+s.rows.length+' satır';
}
function gradePageOpen(html){
 const page=$('gradePage'),opening=page.hidden;
 gradeResize?.disconnect();gradeResize=null;gradeLayout=null;
 if(modal.open)modal.close();$('dashboard').hidden=true;page.hidden=false;page.innerHTML=html;icons();
 if(opening)window.scrollTo(0,0);
}
function setGradeMode(mode){gradeMode=mode;grades()}
function grades(){
 if(!names().includes(activeSheet))activeSheet=names()[0]||'';
 const s=course.sheets[activeSheet];
 if(gradeGridSheet!==s){gradeGridSheet=s;gradeFirstQuestion=0}
 if(s?.anonymous)gradeMode='scores';
 const title='<div class="sheet-heading"><div><small>'+esc(course.code+' · '+course.name)+'</small><h1>Not tablosu</h1></div>'+btn('Ders dosyasına dön','saveGrades()','folder-open')+'</div>';
 const rosterHelp='<div class="import-help"><p id="rosterHelp">OBS ders veya sınav yoklamasını yükleyin. Öğrenci numaraları ve adları otomatik okunur.</p><a class="grade-template-link" href="templates/grade-import.xlsx" download="Boş puan tablosu.xlsx">Boş Excel puan şablonunu indir</a><details><summary>Dosya biçimleri ve sütunlar</summary><dl><dt>Öğrenci listesi</dt><dd>XLS, XLSX, CSV, PDF veya taranmış PNG, JPG ve WebP. Tabloda <b>Öğrenci No</b> ve <b>Adı Soyadı</b> bulunmalı. Ad ve soyad ayrı sütunlarda da olabilir.</dd><dt>Puan tablosu</dt><dd>XLS, XLSX veya UTF-8 CSV. Her öğrenci için bir satır kullanın. <b>Öğrenci No</b> veya anonim sınavlarda <b>Sıra No</b> ile birlikte en az bir soru sütunu (ör. <b>1. Soru</b>), <b>Ham Not</b> veya <b>Harf Notu</b> gerekir. Excel’de her sınav ayrı sayfa olabilir.</dd></dl></details></div>';
 const actions='<div class="grade-tools">'+btn('OBS çıktısından öğrenci listesi yükle','chooseRoster()','upload').replace('<button','<button aria-describedby="rosterHelp"')+btn('Puanları içe aktar','pickGrades()','upload')+(s?'<details class="export-menu"><summary>İndir</summary><div>'+btn('Excel (.xlsx)','exportGrades(false)')+btn('CSV','exportGrades(true)')+'</div></details>':'')+'</div>';
 const tabs=names().map((n,i)=>'<button '+(n===activeSheet?'class="selected" aria-current="true" ':'')+'onclick="changeExam('+i+')">'+esc(n)+'</button>').join('');
 const top='<div class="exam-switch"><nav aria-label="Sınavlar">'+tabs+'</nav>'+btn('Sınav ekle','newSheet()','plus')+'</div>';
 const empty='<div class="grade-empty">'+icon('sheet')+'<h3>Sınav tablosu oluşturun</h3><p>'+(course.roster?.length?course.roster.length+' öğrenci ders listesinde hazır.':'Sınavı oluşturduktan sonra soru puanlarını girebilirsiniz.')+'</p>'+btn('İlk sınavı oluştur','newSheet()','plus')+'</div>';
 const anonymousNote=s?.anonymous?'<p class="grade-note">Anonim sınav. Sıra numarası yalnızca bu tablo içinde geçerlidir. Puanlar soru ortalamalarına katılır. Dönem sonu harf dağılımı için OBS çıktısını yükleyebilirsiniz.</p>':'';
 if(!s){gradePageOpen(title+'<section id="gradeDesk" class="sheet-panel">'+actions+rosterHelp+empty+'</section>');return}
 const scores=gradeMode==='scores'&&s.questions.length;
 const modes=s.anonymous?'<strong>Soru puanları</strong>':'<div class="mode-picker">'+btn('Soru puanları',"setGradeMode('scores')").replace('<button','<button aria-pressed="'+Boolean(scores)+'"')+btn('Dönem sonu notları',"setGradeMode('final')").replace('<button','<button aria-pressed="'+!scores+'"')+'</div>';
 const grid='<div id="gradeGrid"></div>';
 const toolbar='<div class="table-tools"><label class="student-search">'+icon('search')+'<input id="studentSearch" type="search" aria-label="'+(s.anonymous?'Sıra numarası ara':'Öğrenci ara')+'" placeholder="'+(s.anonymous?'Sıra numarası ile ara':'Numara veya ad ile ara')+'" value="'+esc(gradeSearch)+'"></label>'+btn(s.anonymous?'Satır ekle':'Öğrenci ekle',"gradeSearch='';addStudent()",'user-plus')+'</div>';
 gradePageOpen(title+top+'<section id="gradeDesk" class="sheet-panel"><div class="sheet-bar">'+modes+actions+'</div>'+anonymousNote+rosterHelp+toolbar+gradeSettings(s)+(scores?'':'<p class="grade-note">Dönem sonu başarı puanını veya OBS harf notunu girin.</p>')+grid+'<div class="grid-end"><span id="studentCount"></span><span>Tab ile sonraki hücreye, Enter ile alt satıra geçin. Excel’den birden fazla hücre yapıştırabilirsiniz.</span><span id="gradeSaved" role="status"></span></div></section>');
 $('studentSearch').oninput=filterStudents;refreshGradeGrid();filterStudents();
 if(typeof ResizeObserver!=='undefined'){
  gradeResize=new ResizeObserver(()=>refreshGradeGrid(true));
  gradeResize.observe($('gradeGrid'));
 }
 const desk=$('gradeDesk');
 desk.oninput=e=>{
  const el=e.target;
  if(el.matches('[data-map],[data-max],#examWeight')){
   if(el.hasAttribute('data-map'))s.maps[+el.dataset.map]=el.value;
   if(el.hasAttribute('data-max'))(s.maximums??=[])[+el.dataset.max]=el.value;
   if(el.id==='examWeight')s.weight=el.value;
   markGradeEdit();
   return;
  }
  if(!el.matches('[data-row]'))return;
  const row=s.rows[+el.dataset.row],tr=el.closest('tr');
  row[+el.dataset.col]=el.value;
  markGradeEdit();
  const absent=rowAbsent(s,row),checkbox=tr.querySelector('[data-attendance]');
  if(checkbox)checkbox.checked=!absent;
  tr.classList.toggle('exam-absent',absent);
  const sum=tr.querySelector('.sumcell');if(sum)sum.textContent=examRowTotal(s,row);
  updateGradeAverages(s);
 };
 desk.onchange=async e=>{
  const el=e.target;
  if(!el.matches('[data-row],[data-map],[data-max],[data-attendance],#examWeight,#include'))return;
  if(el.hasAttribute('data-attendance')){
   const index=+el.dataset.attendance;
   setRowAbsent(s,s.rows[index],!el.checked);
   markGradeEdit(false);
   refreshGradeGrid();
   $('gradeGrid')?.querySelector('[data-attendance="'+index+'"]')?.focus({preventScroll:true});
  }
  if(el.hasAttribute('data-max')||el.hasAttribute('data-map'))refreshGradeGrid();
  if(el.id==='include'){s.include=el.checked;markGradeEdit(false)}
  await flushGradeEdits();
 };
 desk.onpaste=async e=>{
  const input=e.target;if(!input.hasAttribute('data-row'))return;
  const text=e.clipboardData.getData('text/plain').replace(/\r\n?/g,'\n').replace(/\n$/,'');
  if(!/[\n\t]/.test(text))return;
  e.preventDefault();
  const rows=text.split('\n').map(line=>line.split('\t')),r0=+input.dataset.row,c0=+input.dataset.col,allCols=gradeColumns(s),start=allCols.indexOf(c0),w=headers(s).length;
  if(rows.some(r=>start+r.length>allCols.length)){window.alert('Yapıştırılan sütun sayısı tablonun sağ sınırını aşıyor. İlk hücreyi veya kopyalanan alanı kontrol edin.');return}
  const destinations=pasteDestinations(visibleGradeRows(desk),r0,rows.length,Boolean(gradeSearch.trim()));
  if(!destinations){window.alert('Yapıştırılan satır sayısı aramada görünen öğrenci sayısını aşıyor. Tüm listeye yapıştırmak için aramayı temizleyin.');return}
  for(const [i,r] of rows.entries()){
   const index=destinations[i],target=s.rows[index]??(s.rows[index]=Array(w).fill(''));
   r.forEach((v,j)=>target[allCols[start+j]]=v);
  }
  markGradeEdit(false);await flushGradeEdits();grades();focusGrade(r0,c0);
 };
 desk.onkeydown=e=>{
  if(e.key==='Tab'&&e.target.hasAttribute('data-attendance')){
   const r=+e.target.dataset.attendance,visible=visibleGradeRows(desk),previous=visible[visible.indexOf(r)-1];
   if(e.shiftKey&&previous===undefined)return;
   e.preventDefault();
   const cols=gradeColumns(s);focusGrade(e.shiftKey?previous:r,e.shiftKey?cols.at(-1):cols[0]);return;
  }
  if(!e.target.hasAttribute('data-row')||!['Enter','Tab'].includes(e.key))return;
  const visible=visibleGradeRows(desk),row=+e.target.dataset.row,col=+e.target.dataset.col;
  const step=e.shiftKey?-1:1,rowIndex=visible.indexOf(row);
  if(e.key==='Enter'){
   e.preventDefault();
   const next=visible[rowIndex+step];if(next!==undefined)focusGrade(next,col);
   return;
  }
  const cols=gradeColumns(s),colIndex=cols.indexOf(col),logical=rowIndex*cols.length+colIndex+step;
  const attendanceRow=e.shiftKey&&colIndex===0?row:!e.shiftKey&&colIndex===cols.length-1?visible[rowIndex+1]:undefined;
  if(attendanceRow!==undefined){
   e.preventDefault();desk.querySelector('[data-attendance="'+attendanceRow+'"]')?.focus();return;
  }
  if(logical<0||logical>=cols.length*visible.length)return;
  e.preventDefault();focusGrade(visible[Math.floor(logical/cols.length)],cols[logical%cols.length]);
 };
}
function visibleGradeRows(desk){
 return Array.from(desk.querySelectorAll('tr[data-student]:not([hidden])'),row=>Number(row.dataset.student));
}
function pasteDestinations(visible,first,count,filtered){
 if(!filtered)return Array.from({length:count},(_,i)=>first+i);
 const start=visible.indexOf(first);
 if(start<0||start+count>visible.length)return null;
 return visible.slice(start,start+count);
}
function focusGrade(r,c){
 if(gradeLayout?.scores&&c>=2&&!gradeLayout.columns.includes(c)){
  gradeFirstQuestion=c-2;refreshGradeGrid();
 }
 document.querySelector('[data-row="'+r+'"][data-col="'+c+'"]')?.focus();
}
async function changeExam(i){await collectGrades();activeSheet=names()[i];gradeSearch='';grades()}
async function collectGrades(){while(gradeEdit&&gradeEdit.owner===course)await flushGradeEdits()}
async function saveGrades(){await collectGrades();gradeResize?.disconnect();gradeResize=null;render();$('gradePage').hidden=true;$('gradePage').replaceChildren();$('dashboard').hidden=false;gradeSearch='';if(modal.open)modal.close();window.scrollTo(0,0)}




