const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const {DatabaseSync} = require('node:sqlite');
const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('hex');
const HOUR = 3600000;
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const emailAddress = value => {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
  return email;
};
async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) fail(400, 'Use a password between 12 and 128 characters.');
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, {N:32768, maxmem:64*1024*1024});
  return salt + ':' + key.toString('hex');
}
async function matchesPassword(password, hash) {
  const [salt, expected] = hash.split(':');
  const key = await scrypt(String(password || '').slice(0,128), salt, 64, {N:32768, maxmem:64*1024*1024});
  return crypto.timingSafeEqual(key, Buffer.from(expected,'hex'));
}
function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(ROOT,'data');
  fs.mkdirSync(dataDir,{recursive:true});
  const db = new DatabaseSync(path.join(dataDir,'stock.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS invitations(token TEXT PRIMARY KEY,email TEXT NOT NULL,kind TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,items TEXT NOT NULL);`);
  if (!db.prepare('SELECT id FROM inventory WHERE id=1').get()) {
    const initial = vm.runInNewContext(fs.readFileSync(path.join(ROOT,'inventory.js'),'utf8') + '\nINVENTORY');
    db.prepare('INSERT INTO inventory VALUES(1,1,?)').run(JSON.stringify(initial));
  }
  const attempts = new Map();
  const configuredOrigin = options.origin || process.env.APP_ORIGIN;
  if (configuredOrigin && new URL(configuredOrigin).origin !== configuredOrigin) throw Error('APP_ORIGIN must be an origin without a trailing slash.');
  if (configuredOrigin && !configuredOrigin.startsWith('https://')) throw Error('Hosted APP_ORIGIN must use HTTPS. Use the default localhost setup for development.');
  const secure = configuredOrigin?.startsWith('https://');
  const cookieName = secure ? '__Host-bec_session' : 'bec_session';
  const publicFiles = new Set(['/login.html','/login.js','/theme.css','/assets/leeds-beckett-university-logo.svg']);
  const protectedFiles = new Set(['/index.html','/product-inventory.html','/shop-floor-map.html','/describe-component.html','/staff.html','/staff.js','/app.js','/component-finder.js','/shop-map.js']);
  const json = (res,status,data) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); };
  const redirect = (res,location) => { res.writeHead(303,{Location:location}); res.end(); };
  const setSession = (res,user) => {
    const token=random(), csrf=random();
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(sha(token),user.id,csrf,Date.now()+8*HOUR);
    res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`);
    return csrf;
  };
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) fail(415,'Send JSON data.');
    let chunks=[], length=0;
    for await (const chunk of req) { length+=chunk.length; if(length>2*1024*1024) fail(413,'Request is too large.'); chunks.push(chunk); }
    try { const result=JSON.parse(Buffer.concat(chunks).toString()); if(!result || typeof result!=='object' || Array.isArray(result)) fail(400,'Invalid request.'); return result; }
    catch { fail(400,'Invalid JSON request.'); }
  }
  function rateLimit(req, route) {
    const key=req.socket.remoteAddress+':'+route;
    const now=Date.now();
    if(attempts.size>10000) for(const [k,v] of attempts) if(v.until<now) attempts.delete(k);
    let entry=attempts.get(key);
    if(!entry || entry.until<now) {entry={count:0,until:now+15*60000};attempts.set(key,entry);}
    if(++entry.count>20) fail(429,'Too many attempts. Please try again in 15 minutes.');
  }
  const server=http.createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if(secure) res.setHeader('Strict-Transport-Security','max-age=31536000');
    try {
      const localOrigin=`http://localhost:${server.address()?.port}`;
      const allowedOrigin=configuredOrigin || localOrigin;
      const allowedHosts=configuredOrigin ? [new URL(configuredOrigin).host] : [`localhost:${server.address()?.port}`,`127.0.0.1:${server.address()?.port}`];
      if(!allowedHosts.includes(req.headers.host)) fail(403,'Unrecognised host.');
      const origin=`${secure?'https':'http'}://${req.headers.host}`;
      const url=new URL(req.url,allowedOrigin);
      const route=url.pathname;
      if(!['GET','HEAD'].includes(req.method) && req.headers.origin!==origin) fail(403,'Request origin was not accepted.');
      const cookies=String(req.headers.cookie || '').split(';').map(s=>s.trim());
      const raw=cookies.find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
      const session=raw && db.prepare('SELECT s.*,u.email,u.name,u.role FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1').get(sha(raw),Date.now());
      const user=session && {id:session.user_id,email:session.email,name:session.name,role:session.role};
      const adminExists=()=>Boolean(db.prepare("SELECT id FROM users WHERE role='admin'").get());
      const bootstrapAllowed=()=>!adminExists() && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !configuredOrigin;
      if(route==='/api/auth/status' && req.method==='GET') return json(res,200,{setup:bootstrapAllowed()});
      if(route==='/api/auth/setup' && req.method==='POST') {
        if(!bootstrapAllowed()) fail(403,'Initial setup is unavailable.');
        rateLimit(req,'setup');
        const input=await body(req), email=emailAddress(input.email), password=await passwordHash(input.password);
        const name=String(input.name || '').trim().slice(0,100);
        if(!name) fail(400,'Enter your name.');
        if(adminExists()) fail(409,'Setup has already been completed.');
        const created={id:crypto.randomUUID(),email,name,role:'admin'};
        db.prepare('INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,?)').run(created.id,email,name,password,'admin');
        return json(res,201,{user:created,csrf:setSession(res,created)});
      }
      if(route==='/api/auth/login' && req.method==='POST') {
        rateLimit(req,'login');
        const input=await body(req), email=emailAddress(input.email);
        const account=db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
        // Use the same password work even when an account does not exist.
        const dummy='00000000000000000000000000000000:'+ '00'.repeat(64);
        const valid=await matchesPassword(input.password,account?.password || dummy);
        if(typeof input.password!=='string' || input.password.length>128) fail(401,'Email or password is incorrect.');
        if(!account || !valid) fail(401,'Email or password is incorrect.');
        return json(res,200,{csrf:setSession(res,account)});
      }
      if(route==='/api/auth/accept' && req.method==='POST') {
        rateLimit(req,'accept');
        const input=await body(req);
        const token=sha(String(input.token || ''));
        const invitation=db.prepare('SELECT * FROM invitations WHERE token=? AND expires>?').get(token,Date.now());
        if(!invitation) fail(400,'This invitation or password reset link is invalid or has expired.');
        const password=await passwordHash(input.password);
        const name=String(input.name || '').trim().slice(0,100);
        if(invitation.kind==='invite' && !name) fail(400,'Enter your name.');
        db.exec('BEGIN IMMEDIATE');
        try {
          if(!db.prepare('DELETE FROM invitations WHERE token=? AND expires>?').run(token,Date.now()).changes) fail(400,'This link has already been used or has expired.');
          let account=db.prepare('SELECT * FROM users WHERE email=?').get(invitation.email);
          if(invitation.kind==='reset') {
            if(!account || !account.active) fail(400,'This link is no longer available.');
            db.prepare('UPDATE users SET password=? WHERE id=?').run(password,account.id);
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id);
          } else {
            if(account) fail(409,'This account already exists.');
            account={id:crypto.randomUUID(),email:invitation.email,name,role:'staff'};
            db.prepare('INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,?)').run(account.id,account.email,name,password,'staff');
          }
          db.exec('COMMIT');
          return json(res,200,{csrf:setSession(res,account)});
        } catch(error) {db.exec('ROLLBACK');throw error;}
      }
      if(route.startsWith('/api/')) {
        if(!user) fail(401,'Please sign in.');
        if(!['GET','HEAD'].includes(req.method) && req.headers['x-csrf-token']!==session.csrf) fail(403,'Your session could not be verified. Refresh and try again.');
        if(route==='/api/session' && req.method==='GET') return json(res,200,{user,csrf:session.csrf});
        if(route==='/api/auth/logout' && req.method==='POST') {
          db.prepare('DELETE FROM sessions WHERE token=?').run(session.token);
          res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure':''}`);
          return json(res,200,{ok:true});
        }
        if(route==='/api/inventory' && req.method==='GET') {
          const row=db.prepare('SELECT * FROM inventory WHERE id=1').get();
          return json(res,200,{version:row.version,items:JSON.parse(row.items)});
        }
        if(route==='/api/inventory' && req.method==='PUT') {
          const input=await body(req);
          if(!Number.isInteger(input.version) || !Array.isArray(input.items) || input.items.length>3000) fail(400,'Invalid inventory.');
          const ids=new Set();
          const products=input.items.map(p=>{
            if(!p || typeof p!=='object' || typeof p.id!=='string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || ids.has(p.id)) fail(400,'Invalid or duplicate product ID.');
            ids.add(p.id);
            const item={id:p.id};
            for(const field of ['name','sku','category','area','shelf','notes','status']) {
              if(p[field]!=null && typeof p[field]!=='string') fail(400,'Product fields must be text.');
              item[field]=String(p[field] || '').trim();
              if(item[field].length>2000) fail(400,'A product field is too long.');
            }
            if(!item.name || !item.area || !item.shelf) fail(400,'Product name, area and shelf are required.');
            if(p.quantity!==null && (!Number.isSafeInteger(p.quantity) || p.quantity<0)) fail(400,'Quantity must be a non-negative whole number or blank.');
            item.quantity=p.quantity;
            return item;
          });
          const result=db.prepare('UPDATE inventory SET version=version+1,items=? WHERE id=1 AND version=?').run(JSON.stringify(products),input.version);
          if(!result.changes) fail(409,'A colleague changed the inventory. The latest list has been loaded; please retry your change.');
          return json(res,200,{version:input.version+1,items:products});
        }
        if(route.startsWith('/api/admin/')) {
          if(user.role!=='admin') fail(403,'Administrator access is required.');
          if(route==='/api/admin/users' && req.method==='GET') return json(res,200,{users:db.prepare('SELECT id,email,name,role,active FROM users ORDER BY name').all()});
          if(route==='/api/admin/invitations' && req.method==='POST') {
            const input=await body(req), email=emailAddress(input.email), kind=input.kind==='reset'?'reset':'invite';
            const existing=db.prepare('SELECT * FROM users WHERE email=?').get(email);
            if(kind==='invite' && existing) fail(409,'This account already exists. Use a password reset instead.');
            if(kind==='reset' && (!existing || !existing.active)) fail(404,'No active account was found.');
            const token=random();
            db.prepare('DELETE FROM invitations WHERE email=?').run(email);
            db.prepare('INSERT INTO invitations VALUES(?,?,?,?)').run(sha(token),email,kind,Date.now()+24*HOUR);
            return json(res,201,{url:`${origin}/login.html#${kind}=${token}`,expires:'24 hours'});
          }
          if(route==='/api/admin/disable' && req.method==='POST') {
            const input=await body(req);
            if(input.id===user.id) fail(400,'You cannot disable your own account.');
            const account=db.prepare('SELECT * FROM users WHERE id=?').get(String(input.id));
            if(!account) fail(404,'Account not found.');
            db.prepare('UPDATE users SET active=0 WHERE id=?').run(account.id);
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id);
            db.prepare('DELETE FROM invitations WHERE email=?').run(account.email);
            return json(res,200,{ok:true});
          }
        }
        fail(404,'Not found.');
      }
      if(!['GET','HEAD'].includes(req.method)) fail(405,'Method not allowed.');
      const fileRoute=route==='/'?'/index.html':route;
      if(!publicFiles.has(fileRoute) && !user) return redirect(res,'/login.html');
      if(fileRoute==='/staff.html' && user?.role!=='admin') fail(403,'Administrator access is required.');
      const asset=/^\/assets\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|svg|webp)$/.test(fileRoute);
      if(!publicFiles.has(fileRoute) && !protectedFiles.has(fileRoute) && !asset) fail(404,'Not found.');
      const file=path.join(ROOT,fileRoute.slice(1));
      if(!fs.existsSync(file)) fail(404,'Not found.');
      const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
      res.writeHead(200,{'Content-Type':types[path.extname(file)],'Content-Length':fs.statSync(file).size});
      if(req.method==='HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch(error) {
      if(!res.headersSent) json(res,error.status || 500,{error:error.status?error.message:'The server could not complete the request.'});
      else res.end();
    }
  });
  server.on('close',()=>db.close());
  server.requestTimeout=15000;
  server.headersTimeout=10000;
  return server;
}
if(require.main===module) {
  if(Number(process.versions.node.split('.')[0])<24) throw Error('Use Node.js 24 or later.');
  const host=process.env.HOST || '127.0.0.1';
  if(host!=='127.0.0.1' && !process.env.APP_ORIGIN) throw Error('Configure APP_ORIGIN before exposing the server to other computers.');
  const server=createApp();
  server.listen(Number(process.env.PORT || 3000),host,()=>console.log(`BEC TECH running at ${process.env.APP_ORIGIN || 'http://localhost:'+server.address().port}. First run: open /login.html locally to create the administrator.`));
}
module.exports={createApp};
