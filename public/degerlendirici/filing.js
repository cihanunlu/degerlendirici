const examTypes=['Vize','Final','Mazeret','Bütünleme','Kısa Sınav'];
const activityTypes=[...examTypes,'Ödev','Sunum','Dönem Ödevi','Proje','Deney Raporu','Diğer'];
const levels=['Yetersiz','Orta','İyi'];
let filingDraft;
const filingFilters=new Map();
function filingKey(value){return norm(prettyExam(value))}
function filingTypes(group,extra=[]){
 const choices=new Map();
 const saved=(course.fileTags?.[group]||[]).map(t=>t?.activity);
 for(const activity of [...names(),...(group===6?examTypes:activityTypes),...saved,...extra]){
  if(activity&&!choices.has(filingKey(activity)))choices.set(filingKey(activity),activity);
 }
 return [...choices.values()];
}
function filingOptions(types,selected){
 return types.map(n=>'<option value="'+esc(n)+'" '+(selected&&filingKey(n)===filingKey(selected)?'selected':'')+'>'+esc(prettyExam(n))+'</option>').join('');
}
function selectedFiling(group){
 return filingFilters.get(course.id+'|'+group)||'';
}
function filterFiling(group,value){
 filingFilters.set(course.id+'|'+group,value);render();
 $('filingFilter'+group)?.focus();
}
function filingMatch(tag,value){
 if(value==='unclassified')return !tag?.activity;
 return !value.startsWith('activity:')||Boolean(tag?.activity&&filingKey(tag.activity)===filingKey(value.slice(9)));
}
async function downloadFilteredFiling(group){
 const current=selectedFiling(group);
 if(!current.startsWith('activity:'))return;
 const files=course.files[group],tags=course.fileTags?.[group]||[],names=sectionFilenames(group,files,tags);
 const entries=files.flatMap((file,index)=>filingMatch(tags[index],current)?[[names[index],file]]:[]);
 if(!entries.length){notify('Bu seçimde indirilecek dosya bulunmuyor.');return}
 if(entries.length===1){const [name,file]=entries[0];download(file,name);return}
 const zip=new JSZip(),activity=prettyExam(current.slice(9));
 for(const [name,file] of entries)zip.file(name,await file.arrayBuffer());
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
 download(blob,safePart(activity+' - '+(group===6?'Cevap Anahtarları':'Öğrenci Faaliyet Örnekleri'))+'.zip');
}
function prettyExam(n){
 const base=cleanRosterText(n);
 const key=norm(base).replace(/\s+sinav[iı]?$/,'');
 const known=examTypes.find(x=>norm(x)===key);
 if(key==='ara'||key==='ara sinav')return 'Vize Sınavı';
 if(known)return known==='Kısa Sınav'?known:known+' Sınavı';
 return base;
}
function safePart(s){return cleanRosterText(s).replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/,'')||'Belge'}
function attachmentTitle(group,file,tag){
 if(!tag?.activity)return safePart(file.name);
 const ext=file.name.match(/\.[^./\\]+$/)?.[0]||'';
 const activity=prettyExam(tag.activity);
 const questions=Array.isArray(tag.questions)?tag.questions:[];
 let title=group===6?activity+(questions.length?' - '+questions.join(', '):'')+' Cevap Anahtarı':activity+(tag.level?' - '+tag.level:'');
 return safePart(title)+ext;
}
function sectionFilenames(i,files=course.files[i],tags=course.fileTags?.[i]||[]){
 const used=new Set();
 return files.map((file,j)=>{
  let original=attachmentTitle(i,file,tags[j]),name=original,seq=2;
  const dot=original.lastIndexOf('.'),stem=dot>0?original.slice(0,dot):original,ext=dot>0?original.slice(dot):'';
  while(used.has(norm(name))){name=stem+' ('+seq+')'+ext;seq++}
  used.add(norm(name));return name;
 });
}
function classifyFiles(group,files,edit=null){
 filingDraft={group,files,edit,owner:course.id};
 const prior=course.fileTags?.[group]||[];
 const filterValue=selectedFiling(group);
 const initial=filterValue.startsWith('activity:')?filterValue.slice(9):'';
 const types=filingTypes(group);
 const forms=files.map((f,i)=>{
  const tag=edit===null?null:prior[edit];
  return '<fieldset class="filing" data-index="'+i+'"><legend>'+esc(f.name)+'</legend><label>'+(group===6?'Sınav':'Sınav veya faaliyet')+'<select class="file-kind" required><option value="">Seçiniz</option>'+filingOptions(types,tag?.activity||initial)+'</select></label>'+(group===7?'<label>Düzey<select class="file-level" required><option value="">Seçiniz</option>'+levels.map(n=>'<option '+(n===tag?.level?'selected':'')+'>'+n+'</option>').join('')+'</select></label>':'<div class="file-questions"></div>')+'<p class="suggested-name"></p></fieldset>';
 }).join('');
 const bulk=files.length>1?'<label>Tüm dosyalara uygula<select id="filingBulk"><option value="">Sınav veya faaliyet seçin</option>'+filingOptions(types,initial)+'</select></label>':'';
 dialog(group===6?'Cevap anahtarlarını sınıflandır':'Faaliyet örneklerini sınıflandır','<form id="filingForm">'+bulk+forms+'<button class="primary">'+(edit===null?'Dosyaları ekle':'Değişiklikleri kaydet')+'</button></form>');
 const form=$('filingForm');
 function refresh(box,previous=[]){
  const exam=box.querySelector('.file-kind').value;
  if(group===6){
   const sh=names().find(n=>norm(prettyExam(n))===norm(prettyExam(exam)));
   const questions=Array.from(new Set([...(course.sheets[sh]?.questions||[]),...previous]));
   box.querySelector('.file-questions').innerHTML=!exam?'':'<p>Belirli soruları seçin veya tüm sınav için boş bırakın.</p><div class="q-picks">'+questions.map(q=>'<label><input type="checkbox" value="'+esc(q)+'" '+(previous.includes(q)?'checked':'')+'> '+esc(q)+'</label>').join('')+'</div>'+(!questions.length?'<label>Soru numaraları (isteğe bağlı)<input class="manual-questions" placeholder="Örneğin 1, 3, 5" pattern="[0-9,; ]*"></label>':'');
  }
 }
 for(const box of form.querySelectorAll('.filing'))refresh(box,edit!==null?prior[edit]?.questions||[]:[]);
 form.onchange=e=>{
  if(e.target.id==='filingBulk'&&e.target.value){
   for(const box of form.querySelectorAll('.filing')){
    const select=box.querySelector('.file-kind');
    if(select.value!==e.target.value){select.value=e.target.value;refresh(box)}
   }
  }else if(e.target.matches('.file-kind')){
   refresh(e.target.closest('.filing'));
   const master=$('filingBulk');if(master)master.value='';
  }
  previewFiling();
 };
 form.oninput=previewFiling;form.onsubmit=commitFiling;previewFiling();
}
function readTag(box){
 const questions=Array.from(box.querySelectorAll('.file-questions input:checked'),el=>el.value);
 const extra=box.querySelector('.manual-questions')?.value.match(/\d+/g)||[];
 return {activity:box.querySelector('.file-kind').value,level:box.querySelector('.file-level')?.value||'',questions:[...new Set([...questions,...extra.map(n=>Number(n)+'. Soru')])]};
}
function pendingFiling(){
 const {group,files,edit}=filingDraft;
 const tags=Array.from({length:course.files[group].length},(_,i)=>course.fileTags?.[group]?.[i]||null),incoming=Array.from($('filingForm').querySelectorAll('.filing'),readTag);
 if(edit===null)tags.push(...incoming);else tags[edit]=incoming[0];
 return {tags,filenames:sectionFilenames(group,edit===null?[...course.files[group],...files]:course.files[group],tags)};
}
function previewFiling(){
 const {group,edit}=filingDraft,{filenames}=pendingFiling();
 for(const box of $('filingForm').querySelectorAll('.filing')){
  const tag=readTag(box);box.querySelector('.suggested-name').textContent=tag.activity&&(group===6||tag.level)?'Paketteki adı: '+filenames[edit??course.files[group].length+Number(box.dataset.index)]:'';
 }
}
async function commitFiling(e){
 e.preventDefault();const {group,files,edit,owner}=filingDraft;if(owner!==course.id)return;
 const {tags}=pendingFiling();
 if(selectedFiling(group)){
  const selectedTags=edit===null?tags.slice(course.files[group].length):[tags[edit]];
  const kind=selectedTags[0]?.activity;
  filingFilters.set(course.id+'|'+group,kind&&selectedTags.every(t=>t.activity===kind)?'activity:'+kind:'');
 }
 if(edit===null)course.files[group].push(...files);
 (course.fileTags??={})[group]=tags;course.done[group]=false;opened=group;filter=0;await save();filingDraft=null;modal.close();
}
function attachmentList(i){
 const labeled=i===6||i===7;
 const filenames=labeled?sectionFilenames(i):[];
 const current=labeled?selectedFiling(i):'';
 const items=course.files[i].map((f,j)=>{
  const tag=course.fileTags?.[i]?.[j];
  if(!filingMatch(tag,current))return '';
  return '<div class="file">'+icon('paperclip')+'<div class="file-name">'+esc(labeled?filenames[j]:f.name)+(labeled&&tag?'<span class="sub">'+esc(f.name)+'</span>':'')+'</div><div class="file-actions">'+(labeled?btn(tag?.activity?'Eşleşmeyi düzenle':'Sınıflandır','classifyFiles('+i+',[course.files['+i+']['+j+']],'+j+')'):'')+btn('İndir','getFile('+i+','+j+')')+btn('Kaldır','removeFile('+i+','+j+')')+'</div></div>';
 }).join('');
 if(!labeled)return items;
 const options=filingTypes(i).map(n=>'<option value="activity:'+esc(n)+'" '+(current.startsWith('activity:')&&filingKey(current.slice(9))===filingKey(n)?'selected':'')+'>'+esc(prettyExam(n))+'</option>').join('');
 const unclassified=course.files[i].some((_,j)=>!course.fileTags?.[i]?.[j]?.activity);
 const selector='<label class="filing-filter"><span>'+(i===6?'Sınava göre göster':'Sınava veya faaliyete göre göster')+'</span><select id="filingFilter'+i+'" onchange="filterFiling('+i+',this.value)"><option value="">Tümü</option>'+options+(unclassified||current==='unclassified'?'<option value="unclassified" '+(current==='unclassified'?'selected':'')+'>Sınıflandırılmamış</option>':'')+'</select></label>';
 const downloadChoice=current.startsWith('activity:')&&items?btn('Seçimdeki dosyaları indir','downloadFilteredFiling('+i+')','download'):'';
 return selector+downloadChoice+(items||(current?'<p>Bu seçim için henüz dosya yok.</p>':''));
}
function inferredActivities(){
 const map={'Vize Sınavı':0,'Kısa Sınav':1,'Ödev':2,'Dönem Ödevi':3,'Proje':4,'Deney Raporu':5,'Final Sınavı':7};
 const flags=Array(8).fill(false);
 for(const t of course.fileTags?.[7]||[])if(t)flags[map[prettyExam(t.activity)]??6]=true;
 return flags.map((v,i)=>course.activityOverrides?.[i]??(v||Boolean(course.activities?.[i])));
}
