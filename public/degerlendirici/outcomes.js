function parseOutcomeList(text){
 if(Array.isArray(text))return text.map(v=>({...v}));
 const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 const parsed=lines.map(line=>line.match(/^(?:Ö\s*Ç\s*)?(\d+)\s*(?:[—–.):-]\s*|\s+)(.*)$/iu));
 const used=new Set(parsed.filter(Boolean).map(m=>Number(m[1])));
 let next=1;
 return lines.map((line,i)=>{
  if(parsed[i])return {number:Number(parsed[i][1]),text:parsed[i][2]};
  while(used.has(next))next++;
  return {number:next++,text:line};
 });
}
function currentOutcomes(){return course.outcomeList??parseOutcomeList(course.outcomes)}
function outcomeRow(item,original){
 return '<div class="outcome-row" data-original="'+esc(original??'')+'"><label>ÖÇ numarası<input class="oc-number" type="number" min="1" step="1" required value="'+esc(item.number)+'"></label><label>Çıktı metni<textarea class="oc-text" required rows="2">'+esc(item.text)+'</textarea></label><div class="oc-actions"><button type="button" aria-label="Bu çıktıyı kaldır" onclick="this.closest(\'.outcome-row\').remove();clearOutcomeValidity()">'+icon('trash-2')+'</button></div></div>';
}
function outcomeEditor(items){
 return '<div id="outcomeRows" oninput="clearOutcomeValidity()">'+items.map(item=>outcomeRow(item,item.number)).join('')+'</div><button type="button" onclick="addOutcomeRow()">'+icon('plus')+'Çıktı ekle</button>';
}
function clearOutcomeValidity(){for(const input of $('outcomeRows').querySelectorAll('input,textarea'))input.setCustomValidity('')}
function addOutcomeRow(){
 const ids=Array.from(document.querySelectorAll('.oc-number'),el=>Number(el.value)||0);
 const next=Math.max(0,...ids)+1;
 $('outcomeRows').insertAdjacentHTML('beforeend',outcomeRow({number:next,text:''},null));
 icons();$('outcomeRows').lastElementChild.querySelector('textarea').focus();
}
function readOutcomeRows(){
 const rows=document.querySelectorAll('.outcome-row'),seen=new Set(),items=[],renumber=new Map();
 for(const row of rows){
  const input=row.querySelector('input'),area=row.querySelector('textarea'),number=Number(input.value);
  input.setCustomValidity(Number.isSafeInteger(number)&&number>0&&!seen.has(number)?'':'Her çıktı için farklı bir pozitif tam sayı girin.');
  area.setCustomValidity(area.value.trim()?'':'Çıktı metnini girin.');
  if(!input.reportValidity()||!area.reportValidity())return null;
  seen.add(number);items.push({number,text:area.value.trim()});
  if(row.dataset.original)renumber.set(Number(row.dataset.original),number);
 }
 return {items,renumber};
}
function storeOutcomes({items,renumber}){
 const existing=new Set(currentOutcomes().map(v=>v.number)),kept=new Set(items.map(v=>v.number));
 for(const s of Object.values(course.sheets)){
  s.maps=s.maps.map(label=>{
   if(!/^(?:ÖÇ\s*)?\d+(?:\s*[,/+\-–]\s*(?:ÖÇ\s*)?\d+)*$/iu.test(label))return label;
   const ids=label.match(/\d+/g).map(Number);
   if(!ids.some(id=>renumber.has(id)&&renumber.get(id)!==id||existing.has(id)&&!kept.has(id)))return label;
   const updated=ids.flatMap(id=>renumber.has(id)?[renumber.get(id)]:existing.has(id)&&!kept.has(id)?[]:[id]);
   return updated.length?'ÖÇ '+updated.join('-'):'';
  });
 }
 course.outcomeList=items;
 course.outcomes=items.map(o=>'ÖÇ '+o.number+' — '+o.text.replace(/\s*\n\s*/g,' ')).join('\n');
}
function outcomes(){
 dialog('Öğrenme çıktıları','<form id="outcomeForm">'+outcomeEditor(currentOutcomes())+'<div class="actions"><button class="primary">Kaydet</button><button type="button" onclick="readSyllabus()">İzlenceden oku</button><button type="submit" value="maps">Soru eşleştirmeleri</button></div></form>');
 $('outcomeForm').oninput=clearOutcomeError;
 $('outcomeForm').onsubmit=async e=>{e.preventDefault();const edit=readOutcomeRows();if(!edit)return;storeOutcomes(edit);await save();if(e.submitter?.value==='maps')grades();else modal.close()};
}
function clearOutcomeError(e){if(e.target.matches('.oc-text,.oc-number'))e.target.setCustomValidity('')}

