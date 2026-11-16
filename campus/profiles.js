'use strict';
const Account = (() => {
  const prefix = 'orbita.profile.';
  const tab = 'orbita.session';
  const utf8 = new TextEncoder();
  let current = null;
  function pack(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  const unpack = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  const random = n => crypto.getRandomValues(new Uint8Array(n));
  const normalize = value => value.trim().toLowerCase();
  const read = id => JSON.parse(localStorage.getItem(prefix + id));
  const locked = (id, fn) => navigator.locks ? navigator.locks.request(prefix + id, fn) : fn();
  async function keyFor(password, salt) {
    const base = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:unpack(salt),iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  }
  async function encode(data,key,salt,rev) {
    const iv = random(12);
    const body = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,utf8.encode(JSON.stringify(data)));
    return {salt,rev,iv:pack(iv),body:pack(new Uint8Array(body))};
  }
  async function decode(key,record) {
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:unpack(record.iv)},key,unpack(record.body));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function activate(id,key,record,data) {
    const secret = pack(new Uint8Array(await crypto.subtle.exportKey('raw',key)));
    sessionStorage.setItem(tab,JSON.stringify({id,secret}));
    current = {id,key,rev:record.rev,data};
  }
  async function register(login,name,password) {
    const id = normalize(login);
    if (!/^[a-zа-яё0-9._-]{3,28}$/u.test(id)) throw Error('Логин должен содержать от 3 до 28 букв, цифр, точек, дефисов или подчёркиваний.');
    if (!name.trim() || name.trim().length > 50 || password.length < 10 || password.length > 128) throw Error('Укажи имя и пароль длиной от 10 до 128 символов.');
    await locked(id,async () => {
      if (read(id)) throw Error('Этот логин уже занят в этом браузере.');
      const salt = pack(random(16));
      const key = await keyFor(password,salt);
      const data = {name:name.trim(),enroll:{},work:{}};
      const record = await encode(data,key,salt,1);
      localStorage.setItem(prefix + id,JSON.stringify(record));
      await activate(id,key,record,data);
    });
  }
  async function login(login,password) {
    const id = normalize(login);
    const record = read(id);
    if (!record) throw Error('Не удалось войти. Проверь логин и пароль.');
    const key = await keyFor(password,record.salt);
    let data;
    try { data = await decode(key,record); }
    catch { throw Error('Не удалось войти. Проверь логин и пароль.'); }
    await activate(id,key,record,data);
  }
  async function resume() {
    try {
      const s = JSON.parse(sessionStorage.getItem(tab));
      if (!s) return;
      const record = read(s.id);
      const key = await crypto.subtle.importKey('raw',unpack(s.secret),{name:'AES-GCM'},true,['encrypt','decrypt']);
      current = {id:s.id,key,rev:record.rev,data:await decode(key,record)};
    } catch { logout(); }
  }
  async function change(edit) {
    const s = current;
    if (!s) throw Error('Войди в свой профиль.');
    await locked(s.id,async () => {
      const record = read(s.id);
      if (!record || record.rev !== s.rev) throw Error('Профиль изменился в другой вкладке. Обнови страницу.');
      const data = structuredClone(s.data);
      edit(data);
      const next = await encode(data,s.key,record.salt,record.rev+1);
      if (read(s.id)?.rev !== record.rev) throw Error('Обнови страницу, чтобы увидеть последнюю версию.');
      localStorage.setItem(prefix+s.id,JSON.stringify(next));
      s.data=data;
      s.rev=next.rev;
    });
  }
  function logout() { current=null; sessionStorage.removeItem(tab); }
  return {resume,register,login,logout,change,get data(){return current?.data;}};
})();
