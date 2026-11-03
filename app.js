const KEY = 'becTechStockLocatorProductsV2';
const LEGACY_KEY = 'shopStockLocatorProductsV1';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageAvailable = true;

function readStoredItems(key) {
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(p => p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim() && p.id != null)
      .map(p => ({...p, id: String(p.id)}));
  } catch {
    return null;
  }
}

function load() {
  let loaded = INVENTORY.map(p => ({...p}));
  try {
    const saved = readStoredItems(KEY);
    if (saved !== null) return saved;
    // Keep existing browser entries alongside the imported inventory.
    const old = readStoredItems(LEGACY_KEY) || [];
    loaded = [...loaded, ...old];
    localStorage.setItem(KEY, JSON.stringify(loaded));
    return loaded;
  } catch {
    storageAvailable = false;
    return loaded;
  }
}
let items = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  render();
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
  $('productForm').reset();
  $('editId').value = p?.id || '';
  $('modalTitle').textContent = p ? 'Edit product' : 'Add a product';
  for (const field of ['name','sku','category','area','shelf','notes','status']) $(field).value = p?.[field] || '';
  $('quantity').value = p?.quantity ?? '';
  $('modalBackdrop').classList.add('open');
  $('name').focus();
}
function closeModal() {
  $('modalBackdrop').classList.remove('open');
  $('addBtn')?.focus();
}
function notify(message) {
  $('toast').textContent = message;
  $('toast').style.display = 'block';
  setTimeout(() => $('toast').style.display = 'none', 3500);
}
$('products')?.addEventListener('click', e => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const p = items.find(p => p.id === button.dataset.id);
  if (!p) return;
  if (button.dataset.action === 'edit') openModal(p);
  if (button.dataset.action === 'delete' && confirm(`Delete ${p.name} from your local stock list?`)) {
    items = items.filter(item => item.id !== p.id);
    save();
    notify(storageAvailable ? 'Product deleted' : 'Change could not be saved to this browser');
  }
});
$('search')?.addEventListener('input', render);
if ($('addBtn')) $('addBtn').onclick = () => openModal();
$('cancelBtn').onclick = closeModal;
$('modalBackdrop').addEventListener('click', e => { if (e.target === $('modalBackdrop')) closeModal(); });
$('productForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = $('editId').value || 'p' + Date.now();
  const quantity = $('quantity').value.trim();
  const product = {id, quantity: quantity === '' ? null : Math.max(0, Number(quantity))};
  for (const field of ['name','sku','category','area','shelf','notes','status']) product[field] = $(field).value.trim();
  const index = items.findIndex(p => p.id === id);
  if (index >= 0) items[index] = product;
  else items.push(product);
  save();
  closeModal();
  notify(storageAvailable ? (index >= 0 ? 'Product updated' : 'Product added') : 'Change could not be saved to this browser');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('modalBackdrop').classList.contains('open')) closeModal(); });
render();
if (!storageAvailable) notify('Browser storage is unavailable. Changes will last only for this visit.');

// Refresh cached pages and other open tabs after inventory changes.
if (typeof window !== 'undefined') {
  const refreshInventory = () => {
    items = load();
    render();
    if (typeof showShelfRoute === 'function') showShelfRoute();
  };
  window.addEventListener('pageshow', event => { if (event.persisted) refreshInventory(); });
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) refreshInventory(); });
}
