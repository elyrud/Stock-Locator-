const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items = [], inventoryVersion = 0, csrfToken = '', saving = false, loaded = false;
async function api(route, method = 'GET', data) {
  const response = await fetch(route, {method, headers: data ? {'Content-Type':'application/json','X-CSRF-Token':csrfToken} : {}, body:data ? JSON.stringify(data) : undefined});
  if (response.status === 401) { location.replace('/login.html'); throw Error('Your session has expired. Please sign in.'); }
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Unable to complete the request.'), {status:response.status});
  return result;
}
function syncMessage(message, error = false) {
  if ($('syncStatus')) { $('syncStatus').textContent = message; $('syncStatus').classList.toggle('sync-error',error); }
}
async function refreshInventory() {
  if (saving) return;
  const result = await api('/api/inventory');
  if (saving || result.version < inventoryVersion) return;
  items = result.items; inventoryVersion = result.version; loaded = true;
  render();
  if (typeof showShelfRoute === 'function') showShelfRoute();
  if ($('addBtn')) $('addBtn').disabled = false;
  syncMessage('Shared inventory · Changes are saved for all staff.');
}
async function save(nextItems) {
  if (saving || !loaded) return false;
  saving = true;
  if ($('saveProductBtn')) $('saveProductBtn').disabled = true;
  try {
    const result = await api('/api/inventory','PUT',{version:inventoryVersion,items:nextItems});
    items = result.items; inventoryVersion = result.version; render();
    syncMessage('Shared inventory · Changes saved for all staff.');
    return true;
  } catch (error) {
    saving = false;
    if (error.status === 409) { try { await refreshInventory(); } catch {} }
    syncMessage(error.message,true); notify(error.message);
    return false;
  } finally {
    saving = false;
    if ($('saveProductBtn')) $('saveProductBtn').disabled = false;
  }
}

function render() {
  const q = ($('search')?.value || '').trim().toLowerCase();
  const filtered = items.filter(p => [p.name,p.sku,p.category,p.area,p.shelf,p.notes,p.status].some(v => String(v || '').toLowerCase().includes(q)));
  const counted = items.filter(p => p.quantity !== null && p.quantity !== '' && Number.isFinite(Number(p.quantity)));
  $('productCount').textContent = items.length;
  $('unitCount').textContent = counted.reduce((n,p) => n + Number(p.quantity), 0);
  $('unitCount').title = `Quantities recorded for ${counted.length} of ${items.length} products`;
  $('quantityCoverage').textContent = `Quantities recorded for ${counted.length} of ${items.length} products`;
  $('locationCount').textContent = new Set(items.map(p => p.area + ' / ' + p.shelf)).size;
  if ($('componentSuggestions')?.innerHTML && typeof renderComponentSuggestions === 'function') renderComponentSuggestions();
  if (!$('products')) return;
  $('listTitle').textContent = q ? `Search results (${filtered.length})` : 'All products';
  $('products').innerHTML = filtered.length ? filtered.sort((a,b) => a.name.localeCompare(b.name)).map(p => `<article class="product"><div class="product-icon" aria-hidden="true">&#9638;</div><div class="product-main"><h4>${esc(p.name)}</h4><div class="meta">${esc(p.sku || 'No SKU')} &middot; ${esc(p.category || 'Uncategorised')}</div><div class="location"><span>Stored at</span><b>${esc(p.shelf)}</b><span class="meta">${esc(p.area)}</span></div><div class="qty">Quantity: <strong>${p.quantity == null || p.quantity === '' ? 'Not recorded' : esc(p.quantity)}</strong>${p.status ? ` &middot; ${esc(p.status)}` : ''}</div>${p.notes ? `<p class="inventory-note">${esc(p.notes)}</p>` : ''}<div class="actions"><button class="btn secondary" data-action="edit" data-id="${esc(p.id)}">Edit</button><button class="btn secondary" data-action="delete" data-id="${esc(p.id)}">Delete</button></div></div></article>`).join('') : '<div class="empty"><b>No products found</b><div>Try another search, or add this product.</div></div>';
}


function openModal(p) {
  if (!loaded) return;
  $('productForm').reset();
  $('editId').value = p?.id || '';
  $('modalTitle').textContent = p ? 'Edit product' : 'Add a product';
  for (const field of ['name','sku','category','area','shelf','notes','status']) $(field).value = p?.[field] || '';
  $('quantity').value = p?.quantity ?? '';
  $('modalBackdrop').classList.add('open'); $('name').focus();
}
function closeModal() { if (saving) return; $('modalBackdrop').classList.remove('open'); $('addBtn')?.focus(); }
let toastTimer;
function notify(message) {
  $('toast').textContent = message; $('toast').style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none',5000);
}
$('products')?.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button || saving) return;
  const product = items.find(p => p.id === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === 'edit') openModal(product);
  if (button.dataset.action === 'delete' && confirm(`Delete ${product.name} from the shared inventory for all staff?`)) {
    if (await save(items.filter(p => p.id !== product.id))) notify('Product deleted for all staff.');
  }
});
$('search')?.addEventListener('input', () => { if (loaded) render(); });
if ($('addBtn')) $('addBtn').onclick = () => openModal();
if ($('cancelBtn')) $('cancelBtn').onclick = closeModal;
$('modalBackdrop')?.addEventListener('click', event => { if (event.target === $('modalBackdrop')) closeModal(); });
$('productForm')?.addEventListener('submit', async event => {
  event.preventDefault(); if (saving || !loaded) return;
  const editId = $('editId').value;
  if (editId && !items.some(p => p.id === editId)) return notify('This product was deleted. Close this form and refresh the list.');
  const quantity = $('quantity').value.trim();
  const product = {id:editId || 'p-' + crypto.randomUUID(),quantity:quantity === '' ? null : Number(quantity)};
  for (const field of ['name','sku','category','area','shelf','notes','status']) product[field] = $(field).value.trim();
  const next = editId ? items.map(p => p.id === editId ? product : p) : [...items,product];
  if (await save(next)) { closeModal(); notify(editId ? 'Product updated for all staff.' : 'Product added for all staff.'); }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('modalBackdrop')?.classList.contains('open')) closeModal(); });
async function startStaffSession() {
  try {
    const session = await api('/api/session'); csrfToken = session.csrf;
    if ($('sessionTools')) {
      $('sessionTools').innerHTML = `<span>${esc(session.user.name)}</span>${session.user.role === 'admin' ? '<a href="staff.html">Staff accounts</a>' : ''}<button type="button" class="btn secondary" id="signOut">Sign out</button>`;
      $('signOut').addEventListener('click',async () => { try { await api('/api/auth/logout','POST',{}); location.replace('/login.html'); } catch (error) { notify(error.message); } });
    }
    await refreshInventory();
  } catch (error) {syncMessage('Unable to load the shared inventory. '+error.message,true);}
}
startStaffSession();
window.addEventListener('pageshow',event => { if (event.persisted) startStaffSession(); });
window.addEventListener('focus',() => { if (loaded && !$('modalBackdrop')?.classList.contains('open')) refreshInventory().catch(error => syncMessage(error.message,true)); });
