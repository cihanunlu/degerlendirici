import {sections,present,filename,parseScores,packageCourse} from "./exports.js";

const byId=id=>document.getElementById(id);
const form=byId("courseForm"), dialog=byId("dialog"), selector=byId("courses");
const status=message=>{byId("status").textContent=message;};
let db,current=null,editing=null;
function element(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
function button(label,action){const b=element("button",label);b.type="button";b.onclick=()=>run(action);return b;}
async function run(action){try{await action();}catch(err){status("İşlem tamamlanamadı. "+err.message);}}
function request(req){return new Promise((ok,fail)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error);});}
function change(id,mutate){
  return new Promise((ok,fail)=>{
    const tx=db.transaction("courses","readwrite"),store=tx.objectStore("courses");
    let error;
    store.get(id).onsuccess=event=>{
      try{const record=mutate(event.target.result);if(record)store.put(record);else store.delete(id);}
      catch(e){error=e;tx.abort();}
    };
    tx.oncomplete=ok;tx.onabort=()=>fail(error||tx.error);
  });
}
function existing(c){if(!c)throw Error("Ders başka bir sekmede silinmiş olabilir. Sayfayı yenileyin.");return c;}
async function refresh(id=current?.id){
  const all=await request(db.transaction("courses").objectStore("courses").getAll());
  all.sort((a,b)=>a.title.localeCompare(b.title,"tr"));
  current=all.find(c=>c.id===id)||all[0]||null;
  selector.replaceChildren(...all.map(c=>new Option([c.code,c.title,c.year,c.term].filter(Boolean).join(" · "),c.id)));
  if(current)selector.value=current.id;
  for(const key of ["picker","workspace","edit"])byId(key).hidden=!current;
  byId("empty").hidden=!!current;
  renderSections();
}
async function update(fn,message){
  const id=current.id;
  await change(id,c=>{existing(c);fn(c);return c;});
  await refresh(id);status(message);
}
function renderSections(){
  const area=byId("sections");
  const open=new Set([...area.querySelectorAll("details[open]")].map(el=>el.dataset.section));
  area.replaceChildren();if(!current)return;
  const count=sections.filter((_,i)=>present(current,i)).length;
  byId("progress").textContent=count+" / "+sections.length+" bölüm hazır";
  sections.forEach((name,i)=>{
    const detail=element("details"),summary=element("summary",name),body=element("div");
    detail.dataset.section=String(i);detail.open=open.has(String(i));
    summary.append(element("span",present(current,i)?"Hazır":"Eksik"));body.className="body";
    if(i===0)body.append(element("p","Kapak ve işaretli belgeler listesi ZIP indirilirken Word biçiminde oluşturulur."));
    else{
      const label=element("label","Belge ekle"),input=element("input");input.type="file";input.multiple=true;label.append(input);body.append(label);
      input.onchange=()=>run(async()=>{
        const files=[...input.files];if(files.length)await update(c=>c.files.push(...files.map(file=>({id:crypto.randomUUID(),section:i,file}))),"Belgeler kaydedildi.");
      });
      for(const item of current.files.filter(f=>f.section===i)){
        const row=element("div");row.className="file";row.append(element("span",item.file.name),button("Kaldır",async()=>{
          if(confirm(item.file.name+" bu dersten kaldırılsın mı?"))await update(c=>{c.files=c.files.filter(f=>f.id!==item.id);},"Belge kaldırıldı.");
        }));body.append(row);
      }
      if(i===4||i===5){
        const key=i===4?"scores":"report",editor=element("details"),heading=element("summary",i===4?"Excel’den soru puanlarını yapıştır":"Raporu burada yaz");
        const label=element("label",i===4?"Puan tablosu":"Değerlendirme metni"),field=element("textarea");field.value=current[key]||"";
        if(i===4)editor.append(heading,element("small","Excel’de başlıklarla birlikte kopyalayın. İlk iki sütun öğrenci numarası ve adı, devamı soru puanları olmalı. Katılmayan öğrenci için her soruya G yazın."));
        else editor.append(heading);
        label.append(field);editor.append(label,button("Kaydet",async()=>{
          const value=field.value.trim();if(i===4&&value)parseScores(value);
          await update(c=>{c[key]=value;},"Kaydedildi.");
        }));body.append(editor);
      }
    }
    detail.append(summary,body);area.append(detail);
  });
}
function showForm(course){
  editing=course?.id||null;form.reset();
  const year=new Date().getFullYear();
  const years=Array.from({length:12},(_,i)=>(year+1-i)+"–"+(year+2-i));
  if(course?.year&&!years.includes(course.year))years.push(course.year);
  form.elements.year.replaceChildren(...years.map(s=>new Option(s,s)));
  form.elements.year.value=course?.year||years[new Date().getMonth()<8?2:1];
  if(course)for(const k of ["title","code","teacher","term"])form.elements[k].value=course[k];
  byId("delete").hidden=!course;dialog.showModal();form.elements.title.focus();
}
byId("new").onclick=()=>showForm(null);byId("edit").onclick=()=>showForm(current);
byId("cancel").onclick=()=>dialog.close();selector.onchange=()=>run(()=>refresh(selector.value));
form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const fields=Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,v.trim()]));
  if(!fields.title){form.elements.title.focus();return;}
  const id=editing||crypto.randomUUID();
  await change(id,c=>({...((editing&&existing(c))||{id,files:[],report:"",scores:""}),...fields}));
  dialog.close();await refresh(id);status("Ders kaydedildi.");
});};
byId("delete").onclick=()=>run(async()=>{
  if(!confirm("Bu ders ve eklediğiniz belgeler bu cihazdan silinsin mi?"))return;
  await change(editing,()=>null);dialog.close();await refresh();status("Ders silindi.");
});
byId("pack").onclick=()=>run(async()=>{
  const b=byId("pack"),course=current;b.disabled=true;
  try{
    const blob=await packageCourse(course),url=URL.createObjectURL(blob),a=element("a");
    a.href=url;a.download=filename(course.title)+" - Ders Değerlendirme Dosyası.zip";
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status("ZIP dosyası hazır.");
  }finally{b.disabled=false;}
});
byId("new").disabled=true;
run(async()=>{const open=indexedDB.open("degerlendirici-bagimsiz",1);
  open.onupgradeneeded=()=>open.result.createObjectStore("courses",{keyPath:"id"});
  db=await request(open);await refresh();byId("new").disabled=false;
});
