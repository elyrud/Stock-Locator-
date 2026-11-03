const el=id=>document.getElementById(id);
const fragment=new URLSearchParams(location.hash.slice(1));
let token=fragment.get('invite') || fragment.get('reset');
let mode=fragment.has('reset')?'reset':token?'invite':'login';
if(token) history.replaceState(null,'',location.pathname);
async function authRequest(route,data) {
  const response=await fetch(route,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  const result=await response.json();
  if(!response.ok) throw Error(result.error || 'Unable to connect.');
  return result;
}
function configureForm() {
  const creating=mode!=='login';
  const named=mode==='setup' || mode==='invite';
  el('authTitle').textContent={login:'Staff sign in',setup:'Create your administrator account',invite:'Set up your staff account',reset:'Set a new password'}[mode];
  el('authIntro').textContent={login:'Sign in with your invited staff account to access the inventory.',setup:'First-time setup is available only on this computer. You will be able to invite colleagues after signing in.',invite:'Choose a password to accept your staff invitation.',reset:'Choose a new password. Your previous sessions will be signed out.'}[mode];
  el('nameField').hidden=!named; el('authName').required=named;
  el('emailField').hidden=Boolean(token); el('authEmail').required=!token;
  el('confirmField').hidden=!creating; el('authConfirm').required=creating;
  el('passwordHelp').hidden=!creating;
  el('authPassword').minLength=creating?12:1;
  el('authPassword').autocomplete=creating?'new-password':'current-password';
  el('authSubmit').textContent=creating?'Save password and sign in':'Sign in';
  el('authSubmit').disabled=false;
}
el('authForm').addEventListener('submit',async event=>{
  event.preventDefault(); el('authSubmit').disabled=true; el('authMessage').textContent='';
  try {
    if(mode!=='login' && el('authPassword').value!==el('authConfirm').value) throw Error('The passwords do not match.');
    const route=mode==='setup'?'/api/auth/setup':token?'/api/auth/accept':'/api/auth/login';
    await authRequest(route,{email:el('authEmail').value,name:el('authName').value,password:el('authPassword').value,token});
    token=null; location.replace('/index.html');
  } catch(error) {el('authMessage').textContent=error.message;el('authSubmit').disabled=false;}
});
(async()=>{
  try {
    const status=await authRequest('/api/auth/status');
    if(!token && status.setup) mode='setup';
    configureForm();
  } catch {el('authMessage').textContent='Start the BEC TECH server to use staff sign in. The IDE static preview cannot authenticate accounts.';}
})();
