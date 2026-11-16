'use strict';
const main = document.querySelector('#main');
const header = document.querySelector('#shell');
let pendingRoute = '';
let filter = '';
let search = '';
let busy = false;
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = (path,label,cls='') => '<a class="'+cls+'" href="#/'+path+'">'+html(label)+'</a>';
const button = (text,cls='primary') => '<button class="'+cls+'" type="submit">'+text+'</button>';
const findProgram = id => PROGRAMS.find(p => p.id === id);
const keyForUnit = (p,i) => p.id+'/'+i;
const attempts = (p,i) => Account.data?.work[keyForUnit(p,i)] || [];
const countUnits = p => p.units.filter((_,i) => attempts(p,i).length).length;
const when = iso => new Date(iso).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
function graphic(kind) {
  return '<canvas data-art="'+kind+'" width="680" height="'+(kind==='sky'?410:220)+'" aria-hidden="true"></canvas>';
}
function paint() {
  for (const canvas of main.querySelectorAll('canvas')) {
    const c = canvas.getContext('2d');
    if (!c) continue;
    const w=canvas.width, h=canvas.height, kind=canvas.dataset.art;
    const line = (x1,y1,x2,y2) => {c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
    const circle = (x,y,r) => {c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
    if (kind==='sky') {
      c.fillStyle='#1d369c'; c.fillRect(0,0,w,h);
      c.strokeStyle='#3b51aa'; c.lineWidth=1;
      for(let x=0;x<w;x+=32) line(x,0,x,h);
      for(let y=0;y<h;y+=32) line(0,y,w,y);
      c.save(); c.translate(375,205); c.rotate(-0.39);
      for(let i=0;i<13;i++) {
        c.beginPath(); c.ellipse(0,0,226,53+9*i,i*0.11,0,2*Math.PI);
        c.strokeStyle=i===10?'#f0ff96':'#a6b4e8'; c.lineWidth=i===10?3:1.2; c.stroke();
      }
      c.fillStyle='#ebf98b'; circle(205,73,12); circle(-135,-132,6);
      c.restore();
      c.strokeStyle='#d5dfef'; c.lineWidth=1; line(65,55,92,55);line(78,43,78,68);line(590,344,619,344);line(604,330,604,359);
    } else if(kind==='atlas') {
      c.fillStyle='#dce4ad';c.fillRect(0,0,w,h); c.strokeStyle='#526f4a'; c.lineWidth=2;
      for(let i=0;i<27;i++){c.beginPath();for(let x=-5;x<=w+5;x+=5){const y=i*11-28+32*Math.sin(x/97+i/5)+12*Math.cos(x/49-i/8);if(x===-5)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
    } else if(kind==='type') {
      c.fillStyle='#d7d0ea';c.fillRect(0,0,w,h);c.fillStyle='#3e335d';c.font='italic 260px Georgia';c.fillText('Aa',90,217);c.strokeStyle='#9c90af';line(0,188,w,188);line(0,61,w,61);
    } else if(kind==='signal') {
      c.fillStyle='#f2c5a6';c.fillRect(0,0,w,h);c.strokeStyle='#964e38';c.lineWidth=3;
      for(let x=0;x<w;x+=9){const y=10+78*Math.abs(Math.sin(x/105)*Math.cos(x/51));line(x,h/2-y,x,h/2+y);}
    } else {
      c.fillStyle='#c1d9e6';c.fillRect(0,0,w,h); for(let i=0;i<8;i++){c.fillStyle=i%2?'#304c67':'#6b9cb0';c.save();c.translate(i*88+6,36+i%3*20);c.rotate(-0.18+i*0.07);c.fillRect(0,0,65,115);c.restore();}
    }
  }
}
function shell(page) {
  const nav = (key,label) => '<a '+(key===page?'aria-current="page" ':'')+'href="#/'+key+'">'+label+'</a>';
  header.innerHTML='<header class="wrap bar">'+link(Account.data?'desk':'','Орбита.','brand')+'<nav aria-label="Основная навигация">'+(Account.data?nav('desk','Обзор'):'')+nav('catalog','Программы')+(Account.data?nav('schedule','Расписание')+nav('journal','Журнал'):'')+'</nav><div class="userbar">'+(Account.data?'<span>'+html(Account.data.name)+'</span><button id="logout" class="bare">Выйти</button>':link('login','Войти','bare')+link('join','Регистрация','small-primary'))+'</div></header>';
}
function cards(list) {
  return list.length ? '<div class="cards">'+list.map(p => '<a href="#/course/'+p.id+'" class="card"><div class="thumb">'+graphic(p.kind)+'</div><div class="cardbody"><small>'+p.field+' · '+p.code+'</small><h3>'+p.title+'</h3><p>'+p.short+'</p><div class="cardfoot"><span>'+p.teacher+'</span><b aria-hidden="true">↗</b></div></div></a>').join('')+'</div>' : '<p class="empty">По этим условиям программ нет.</p>';
}
function home() {
  return '<div class="wrap"><section class="hero"><div class="hero-copy"><div class="eyebrow">Независимый учебный кампус</div><h1>Орбита<span>.</span></h1><p>Мастерские о данных, визуальном языке и городской среде.</p>'+link('catalog','Выбрать программу →','light-button')+'</div><div class="hero-art">'+graphic('sky')+'</div></section><div class="sectitle"><h2>Программы кампуса</h2>'+link('catalog','Все программы →')+'</div>'+cards(PROGRAMS)+'</div>';
}
function catalog() {
  const list = PROGRAMS.filter(p => (!filter || p.field===filter) && (p.title+' '+p.teacher+' '+p.short).toLowerCase().includes(search.trim().toLowerCase()));
  return '<div class="wrap"><div class="eyebrow">Учебный кампус</div><h1>Программы</h1><form id="filter" class="filters"><label>Поиск<input type="search" name="q" value="'+html(search)+'" placeholder="Название или преподаватель"></label><label>Направление<select name="field"><option value="">Все направления</option>'+[...new Set(PROGRAMS.map(p=>p.field))].map(f=>'<option '+(filter===f?'selected':'')+'>'+f+'</option>').join('')+'</select></label>'+button('Найти')+'</form>'+cards(list)+'</div>';
}
function auth(join) {
  return '<div class="auth"><div class="eyebrow">Личный кабинет</div><h1>'+(join?'Регистрация':'Вход')+'</h1><form id="'+(join?'register':'login')+'" class="stack">'+(join?'<label>Имя в кампусе<input name="name" maxlength="50" autocomplete="nickname" required></label>':'')+'<label>Логин<input name="login" minlength="3" maxlength="28" autocomplete="username" required></label><label>Пароль<input name="password" type="password" '+(join?'minlength="10" autocomplete="new-password"':'autocomplete="current-password"')+' maxlength="128" required></label>'+(join?'<small>Пароль от 10 символов. Используй отдельный пароль для кампуса.</small>':'')+button(join?'Создать профиль':'Войти')+'<p class="error" role="alert"></p></form><p>'+link(join?'login':'join',join?'Уже есть профиль? Войти':'Создать профиль')+'</p><small>Профиль и учебные работы хранятся в этом браузере на этом устройстве.</small></div>';
}
const crumbs = (dest,label) => '<div class="crumb">'+link(dest,'← '+label)+'</div>';
function groupOptions(group) {
  return Object.entries(COHORTS).map(([id,g])=>'<option value="'+id+'" '+(group===id?'selected':'')+'>'+g.label+' · '+(id==='day'?'пн':'ср')+' '+g.time+'</option>').join('');
}
function unitList(p,enrolled) {
  return '<div class="rows">'+p.units.map((u,i)=>'<div class="row"><div><small>Модуль '+(i+1)+'</small><h3>'+u[0]+'</h3></div>'+(enrolled?link('unit/'+p.id+'/'+i,attempts(p,i).length?'Работа сдана →':'Перейти →'):'')+'</div>').join('')+'</div>';
}
function course(p) {
  const e = Account.data?.enroll[p.id];
  return '<div class="wrap">'+crumbs('catalog','Программы')+'<div class="split"><div><div class="eyebrow">'+p.field+' / '+p.code+'</div><h1>'+p.title+'</h1><p class="lead">'+p.intro+'</p><div class="sectitle"><h2>Модули программы</h2></div>'+unitList(p,!!e)+'</div><aside class="panel"><div class="thumb">'+graphic(p.kind)+'</div><div class="pad"><small>Преподаватель</small><h3>'+p.teacher+'</h3>'+(e?'<p>'+COHORTS[e.group].label+' · сдано '+countUnits(p)+' из '+p.units.length+'</p>':'<p>Три модуля · две группы</p>')+(Account.data?'<form id="enroll" data-p="'+p.id+'" class="stack"><label>Учебный поток<select name="group">'+groupOptions(e?.group)+'</select></label>'+button(e?'Сохранить поток':'Записаться')+'<p class="error" role="alert"></p></form>':link('join?course='+p.id,'Записаться','primary'))+'</div></aside></div></div>';
}
function unit(p,i) {
  const u=p.units[i], list=attempts(p,i);
  return '<div class="wrap narrow">'+crumbs('course/'+p.id,p.title)+'<div class="eyebrow">Модуль '+(i+1)+' из '+p.units.length+'</div><h1>'+u[0]+'</h1><div class="reading"><h2>Материал</h2><p>'+u[2]+'</p><h2>Практическая работа</h2><p>'+u[1]+'</p></div><form id="submit-work" data-p="'+p.id+'" data-unit="'+i+'" class="stack panel pad"><label>Текст работы<textarea name="body" rows="5" maxlength="4000" required>'+html(list.at(-1)?.text || '')+'</textarea></label>'+button(list.length?'Отправить новую версию':'Сдать работу')+'<p class="error" role="alert"></p></form>'+(list.length?'<div class="sectitle"><h2>История сдачи</h2></div>'+versions(list):'')+'</div>';
}
function versions(list) {
  return '<ol class="versions">'+list.map((a,j)=>'<li><b>Версия '+(j+1)+'</b> · '+COHORTS[a.group].label+' · '+when(a.at)+'<p>'+html(a.text)+'</p></li>').reverse().join('')+'</ol>';
}
function mine() {return PROGRAMS.filter(p=>Account.data.enroll[p.id]);}
function desk() {
  const programs=mine();
  const totals = programs.reduce((sum,p)=>sum+p.units.reduce((n,_,i)=>n+new Set(attempts(p,i).map(a=>a.group)).size,0),0);
  return '<div class="wrap"><div class="eyebrow">Личный кабинет</div><h1>Обзор</h1><p class="lead">'+html(Account.data.name)+', здесь твои программы и результаты.</p><div class="metrics"><div><strong>'+programs.length+'</strong>Программ в работе</div><div><strong id="completed">'+totals+'</strong>Сдано модулей</div></div><div class="sectitle"><h2>Мои программы</h2>'+link('catalog','В каталог →')+'</div>'+(programs.length?cards(programs):'<p class="empty">Пока нет программ. Выбери мастерскую и запишись в поток.</p>')+'</div>';
}
function journal() {
  const entries=[];
  for(const p of mine()) p.units.forEach((u,i)=>{const list=attempts(p,i);if(list.length) entries.push({p,u,i,list});});
  entries.sort((a,b)=>b.list.at(-1).at.localeCompare(a.list.at(-1).at));
  return '<div class="wrap narrow"><div class="eyebrow">Личный кабинет</div><h1>Учебный журнал</h1><p class="lead">Сдано модулей · <b id="journal-count">'+entries.length+'</b></p>'+(entries.length?entries.map(({p,u,i,list})=>'<details class="record"><summary><small>'+p.title+'</small><b>'+u[0]+'</b><span>Версий · '+list.length+'</span></summary>'+versions(list)+link('unit/'+p.id+'/'+i,'К модулю →')+'</details>').join(''):'<p class="empty">Здесь появятся сданные работы и их версии.</p>')+'</div>';
}
function schedule() {
  const rows=[];
  for(const p of mine()){
    const e=Account.data.enroll[p.id], g=COHORTS[e.group];
    const day=new Date(e.from); const [hours,minutes]=g.time.split(':').map(Number);
    day.setHours(hours,minutes,0,0); day.setDate(day.getDate()+(7+g.weekday-day.getDay())%7);
    if(day.getTime()<new Date(e.from).getTime())day.setDate(day.getDate()+7);
    p.units.forEach((u,i)=>{const date=new Date(day);date.setDate(day.getDate()+7*i);rows.push({date,p,u,g,i});});
  }
  rows.sort((a,b)=>a.date-b.date);
  return '<div class="wrap narrow"><div class="eyebrow">Личный кабинет</div><h1>Расписание</h1><p class="lead">Встречи твоих потоков по местному времени.</p>'+(rows.length?'<div class="rows">'+rows.map(({date,p,u,g,i})=>'<div class="row"><div><small>'+html(date.toLocaleDateString('ru-RU',{day:'numeric',month:'long',weekday:'short'}))+' · '+g.time+'</small><h3>'+link('unit/'+p.id+'/'+i,u[0])+'</h3><span>'+p.title+' · '+g.label+'</span></div></div>').join('')+'</div>':'<p class="empty">Запишись на программу, чтобы увидеть расписание.</p>')+'</div>';
}
function notice(message) {
  const s=document.querySelector('#status');s.textContent=message;
  clearTimeout(notice.timer);notice.timer=setTimeout(()=>{s.textContent='';},3200);
}
function render(){
  const raw=location.hash.replace(/^#\/?/, '');
  const [path,query]=raw.split('?'), [page,id,idx]=path.split('/');
  const p=findProgram(id);
  if(page==='join' || page==='login'){const next=new URLSearchParams(query).get('course');if(findProgram(next))pendingRoute='course/'+next;}
  let content;
  if(['desk','journal','schedule','unit'].includes(page)&&!Account.data){pendingRoute=path;location.replace('#/login');return;}
  if(!page)content=Account.data?desk():home();
  else if(page==='catalog')content=catalog();
  else if(page==='login'||page==='join')content=Account.data?desk():auth(page==='join');
  else if(page==='course'&&p)content=course(p);
  else if(page==='unit'&&p&&/^[0-2]$/.test(idx))content=Account.data.enroll[p.id]?unit(p,Number(idx)):course(p);
  else if(page==='desk')content=desk();
  else if(page==='journal')content=journal();
  else if(page==='schedule')content=schedule();
  else if(page==='about')content='<div class="wrap narrow">'+crumbs('','Главная')+'<div class="eyebrow">Об Орбите</div><h1>Кампус прикладных практик</h1><p class="lead">Четыре мастерские объединяют работу с данными, визуальным языком и городской средой. На каждой программе — три модуля с материалом и самостоятельной работой.</p>'+link('catalog','Перейти к программам →','primary')+'</div>';
  else content='<div class="wrap"><h1>Страница не найдена</h1>'+link('','На главную')+'</div>';
  shell(page|| (Account.data?'desk':''));main.innerHTML=content;paint();
  document.title=(main.querySelector('h1')?.textContent.replace(/\.$/,'') || 'Кампус')+' · Орбита';
}
header.addEventListener('click',e=>{if(e.target.id==='logout'&&!busy){Account.logout();pendingRoute='';location.hash='/';render();notice('Вы вышли из профиля.');}});
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();main.focus();});
main.addEventListener('submit',async e=>{
  e.preventDefault();
  if(busy)return;
  const f=e.target, values=new FormData(f), val=k=>String(values.get(k)??'');
  const submit=f.querySelector('button[type="submit"]'), error=f.querySelector('.error');
  if(error)error.textContent='';
  busy=true;if(submit)submit.disabled=true;
  try {
    if(f.id==='filter'){search=val('q');filter=val('field');render();return;}
    if(f.id==='login'||f.id==='register'){
      if(f.id==='login') await Account.login(val('login'),val('password'));else await Account.register(val('login'),val('name'),val('password'));
      const dest=pendingRoute||'desk';pendingRoute='';location.hash='/'+dest;return;
    }
    const p=findProgram(f.dataset.p);
    if(!p)return;
    if(f.id==='enroll'){
      const group=val('group');
      if(!Object.hasOwn(COHORTS,group))return;
      await Account.change(d=>{if(d.enroll[p.id]?.group!==group)d.enroll[p.id]={group,from:new Date().toISOString()};});
      render();notice('Запись в поток сохранена.');
    }else if(f.id==='submit-work'){
      const i=Number(f.dataset.unit), text=val('body').trim();
      if(!text||text.length>4000)throw Error('Введи текст работы длиной до 4000 символов.');
      await Account.change(d=>{
        const k=keyForUnit(p,i);const list=d.work[k]||[];
        list.push({text,group:d.enroll[p.id].group,at:new Date().toISOString()});d.work[k]=list;
      });
      render();notice('Версия работы сохранена.');
    }
  } catch(err) {
    const message=err.name==='QuotaExceededError'?'В браузере закончилось место. Работа не сохранена.':err.name==='Error'?err.message:'Не удалось сохранить изменения. Проверь доступ к хранилищу браузера.';
    if(error)error.textContent=message;else notice(message);
  } finally {busy=false;if(submit)submit.disabled=false;}
});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);main.focus({preventScroll:true});});
Account.resume().then(render);
