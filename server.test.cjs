const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {createApp}=require('./server.cjs');

test('staff-only server, invitations, sessions and shared inventory',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'bec-tech-auth-test-'));
  let server,base;
  async function start(){server=createApp({dataDir});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;}
  async function stop(){await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
  function client(){return {cookie:'',csrf:'',async request(route,method='GET',data,extra={}){
    const response=await fetch(base+route,{method,redirect:'manual',headers:{Cookie:this.cookie,...(method==='GET'?{}:{Origin:base,'Content-Type':'application/json','X-CSRF-Token':this.csrf}),...extra},body:data===undefined?undefined:JSON.stringify(data)});
    const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
    let body;try{body=await response.json();}catch{body=null;}
    if(body?.csrf)this.csrf=body.csrf;
    return {status:response.status,body,headers:response.headers};
  }};}
  await start();
  t.after(async()=>{if(server.listening)await stop();fs.rmSync(dataDir,{recursive:true,force:true});});
  const guest=client(),admin=client(),staff=client();
  for(const file of ['/','/index.html','/product-inventory.html','/shop-floor-map.html','/describe-component.html','/assets/shelf-1a.jpg','/app.js','/inventory.js']) {
    const result=await guest.request(file);assert.equal(result.status,303,file);assert.equal(result.headers.get('location'),'/login.html');
  }
  assert.equal((await guest.request('/login.html')).status,200);
  assert.equal((await guest.request('/api/inventory')).status,401);
  assert.equal((await guest.request('/api/auth/status')).body.setup,true);
  assert.equal((await guest.request('/api/auth/setup','POST',{email:'admin@example.com',name:'Admin',password:'a long test password'},{Origin:'https://other.example'})).status,403);
  const setup=await admin.request('/api/auth/setup','POST',{email:'admin@example.com',name:'Admin',password:'a long test password'});
  assert.equal(setup.status,201);assert.match(setup.headers.get('set-cookie'),/HttpOnly/);assert.match(setup.headers.get('set-cookie'),/SameSite=Lax/);
  assert.equal((await guest.request('/api/auth/status')).body.setup,false);
  assert.equal((await guest.request('/api/auth/setup','POST',{email:'second@example.com',name:'Other',password:'another long password'})).status,403);
  assert.equal((await guest.request('/api/auth/login','POST',{email:'admin@example.com',password:'wrong password'})).status,401);
  assert.equal((await admin.request('/server.cjs')).status,404);
  assert.equal((await admin.request('/data/stock.sqlite')).status,404);
  const initial=await admin.request('/api/inventory');assert.equal(initial.body.items.length,104);
  assert.equal((await admin.request('/api/admin/invitations','POST',{email:'colleague@example.com'},{'X-CSRF-Token':'wrong'})).status,403);
  const invitation=await admin.request('/api/admin/invitations','POST',{email:'colleague@example.com'});
  assert.equal(invitation.status,201);
  const token=new URL(invitation.body.url).hash.split('=')[1];
  const {DatabaseSync}=require('node:sqlite');
  const inspectDb=new DatabaseSync(path.join(dataDir,'stock.sqlite'));
  assert.notEqual(inspectDb.prepare('SELECT password FROM users WHERE email=?').get('admin@example.com').password,'a long test password');
  assert.notEqual(inspectDb.prepare('SELECT token FROM invitations WHERE email=?').get('colleague@example.com').token,token);
  inspectDb.close();
  assert.equal((await staff.request('/api/auth/accept','POST',{token,name:'Colleague',password:'short'})).status,400);
  assert.equal((await staff.request('/api/auth/accept','POST',{token,name:'Colleague',password:'colleague long password'})).status,200);
  assert.equal((await guest.request('/api/auth/accept','POST',{token,name:'Intruder',password:'not valid password'})).status,400);
  assert.equal((await staff.request('/api/admin/users')).status,403);
  assert.equal((await staff.request('/staff.html')).status,403);
  for(const file of ['/index.html','/product-inventory.html','/shop-floor-map.html','/describe-component.html','/assets/shelf-1a.jpg']) assert.equal((await staff.request(file)).status,200,file);
  const changed=initial.body.items.map((p,index)=>index===0?{...p,quantity:42}:p);
  assert.equal((await staff.request('/api/inventory','PUT',{version:initial.body.version,items:changed})).status,200);
  assert.equal((await admin.request('/api/inventory')).body.items[0].quantity,42);
  assert.equal((await admin.request('/api/inventory','PUT',{version:initial.body.version,items:initial.body.items})).status,409);
  assert.equal((await admin.request('/api/inventory','PUT',{version:2,items:[{id:'x',name:'Bad',area:'Area',shelf:'Shelf',quantity:-1}]})).status,400);

  // Run the real frontend against the server using each page's actual element IDs.
  for(const file of ['index.html','product-inventory.html','shop-floor-map.html','describe-component.html']) {
    const html=fs.readFileSync(path.join(__dirname,file),'utf8');
    const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));ids.add('signOut');
    const nodes={};const element=()=>({value:'',innerHTML:'',textContent:'',disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},focus(){},scrollIntoView(){}});
    const get=id=>ids.has(id)?nodes[id] ||= element():null;
    const context=vm.createContext({document:{getElementById:get,addEventListener(){}},window:{location:{hash:''},addEventListener(){}},location:{replace(){}},crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,fetch:(route,options={})=>fetch(base+route,{...options,headers:{Cookie:staff.cookie,Origin:base,...options.headers}})});
    for(const script of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]))vm.runInContext(fs.readFileSync(path.join(__dirname,script),'utf8'),context);
    for(let tries=0;tries<100 && !vm.runInContext('loaded',context);tries++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(vm.runInContext('loaded',context),true,file);
    assert.equal(vm.runInContext('items[0].quantity',context),42);
    if(get('search')){get('search').value='ribbon';vm.runInContext('render()',context);assert.match(get('products').innerHTML,/Ribbon Cable/);}
    if(file==='describe-component.html') {get('componentDescription').value='measure distance';vm.runInContext('renderComponentSuggestions()',context);assert.match(get('componentSuggestions').innerHTML,/Ultrasonic/);}
    if(file==='shop-floor-map.html'){context.window.location.hash='#shelf-3C';vm.runInContext('showShelfRoute()',context);assert.match(get('shelfPhoto').innerHTML,/shelf-3c.jpg/);}
    const nav=[...html.matchAll(/<a href="([^"#]+\.html)"/g)].map(m=>m[1]);for(const link of nav)assert.ok(fs.existsSync(path.join(__dirname,link)));
  }
  const reset=await admin.request('/api/admin/invitations','POST',{email:'colleague@example.com',kind:'reset'});
  const resetToken=new URL(reset.body.url).hash.split('=')[1];
  const newSession=client();assert.equal((await newSession.request('/api/auth/accept','POST',{token:resetToken,password:'replacement long password'})).status,200);
  assert.equal((await staff.request('/api/session')).status,401);
  const userId=(await newSession.request('/api/session')).body.user.id;
  assert.equal((await admin.request('/api/admin/disable','POST',{id:userId})).status,200);
  assert.equal((await newSession.request('/api/session')).status,401);
  await stop();await start();
  const again=client();assert.equal((await again.request('/api/auth/login','POST',{email:'admin@example.com',password:'a long test password'})).status,200);
  assert.equal((await again.request('/api/inventory')).body.items[0].quantity,42);
  const oldCookie=again.cookie;assert.equal((await again.request('/api/auth/logout','POST',{})).status,200);again.cookie=oldCookie;
  assert.equal((await again.request('/api/session')).status,401);
  const expired=client();assert.equal((await expired.request('/api/auth/login','POST',{email:'admin@example.com',password:'a long test password'})).status,200);
  const expireDb=new DatabaseSync(path.join(dataDir,'stock.sqlite'));expireDb.prepare('UPDATE sessions SET expires=0').run();expireDb.close();
  assert.equal((await expired.request('/api/session')).status,401);
  for(let attempt=0;attempt<21;attempt++)await guest.request('/api/auth/login','POST',{email:'unknown@example.com',password:'wrong password'});
  assert.equal((await guest.request('/api/auth/login','POST',{email:'unknown@example.com',password:'wrong password'})).status,429);
});
