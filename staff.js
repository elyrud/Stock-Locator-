const el=id=>document.getElementById(id);
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let csrf='',currentUser='';
async function request(route,data) {
  const response=await fetch(route,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:data?JSON.stringify(data):undefined});
  if(response.status===401){location.replace('/login.html');throw Error('Please sign in.');}
  const result=await response.json();
  if(!response.ok) throw Error(result.error || 'Request failed.');
  return result;
}
async function showUsers() {
  const {users}=await request('/api/admin/users');
  el('staffList').innerHTML=users.map(user=>`<div class="staff-row"><div><strong>${escapeText(user.name)}</strong><p class="meta">${escapeText(user.email)} &middot; ${escapeText(user.role)} &middot; ${user.active?'Active':'Disabled'}</p></div>${user.id!==currentUser && user.active?`<button class="btn secondary" data-disable="${escapeText(user.id)}">Disable access</button>`:''}</div>`).join('');
}
el('inviteForm').addEventListener('submit',async event=>{
  event.preventDefault();el('staffMessage').textContent='';el('privateLink').hidden=true;
  try {const result=await request('/api/admin/invitations',{email:el('staffEmail').value,kind:el('inviteKind').value});el('inviteLink').value=result.url;el('privateLink').hidden=false;el('staffMessage').textContent='Link created. It expires in 24 hours. Creating another link for this email invalidates the previous one.';}
  catch(error){el('staffMessage').textContent=error.message;}
});
el('copyInvite').addEventListener('click',async()=>{
  try {await navigator.clipboard.writeText(el('inviteLink').value);el('staffMessage').textContent='Private link copied.';}
  catch {el('inviteLink').select();el('staffMessage').textContent='Select and copy the private link above.';}
});
el('staffList').addEventListener('click',async event=>{
  const button=event.target.closest('[data-disable]');
  if(!button || !confirm('Disable this account and sign out all of its sessions?')) return;
  try {await request('/api/admin/disable',{id:button.dataset.disable});await showUsers();el('staffMessage').textContent='Staff access disabled.';}
  catch(error){el('staffMessage').textContent=error.message;}
});
(async()=>{try{const session=await request('/api/session');csrf=session.csrf;currentUser=session.user.id;await showUsers();}catch(error){el('staffMessage').textContent=error.message;}})();
