// Match rack names only after their positions have been confirmed.
// Set photo to a local asset path when each shelf photograph is available.
const SHOP_SHELVES = [
  {id: '1A', position: 'Left wall, top shelf, left half', x: 4.4, y: 8.5, width: 10.2, height: 11.8, photo: 'assets/shelf-1a.jpg', rack: null},
  {id: '1B', position: 'Left wall, top shelf, right half', x: 14.6, y: 8.5, width: 10.2, height: 11.8, photo: 'assets/shelf-1b.jpg', rack: null},
  {id: '2A', position: 'Left wall, second shelf, left side, top', x: 4.4, y: 29.1, width: 10.2, height: 6.15, photo: null, pinSource: 'none', rack: null},
  {id: '2B', position: 'Left wall, second shelf, right side, top', x: 14.6, y: 29.1, width: 10.2, height: 6.15, photo: null, pinSource: 'none', rack: null},
  {id: '2C', position: 'Left wall, second shelf, left side, bottom', x: 4.4, y: 35.25, width: 10.2, height: 6.15, photo: 'assets/shelf-2c.jpg', pinSource: 'none', rack: null},
  {id: '2D', position: 'Left wall, second shelf, right side, bottom', x: 14.6, y: 35.25, width: 10.2, height: 6.15, photo: 'assets/shelf-2b.jpg', pinSource: '2B', rack: null},
  {id: '3A', position: 'Left wall, third shelf, top left', x: 4.4, y: 49.9, width: 6.8, height: 6.15, photo: 'assets/shelf-3a.jpg', rack: null},
  {id: '3B', position: 'Left wall, third shelf, top middle', x: 11.2, y: 49.9, width: 6.8, height: 6.15, photo: 'assets/shelf-3b.jpg', rack: null},
  {id: '3C', position: 'Left wall, third shelf, top right', x: 18, y: 49.9, width: 6.8, height: 6.15, photo: 'assets/shelf-3c.jpg', rack: null},
  {id: '3D', position: 'Left wall, third shelf, bottom left', x: 4.4, y: 56.05, width: 6.8, height: 6.15, photo: null, rack: null},
  {id: '3E', position: 'Left wall, third shelf, bottom middle', x: 11.2, y: 56.05, width: 6.8, height: 6.15, photo: null, rack: null},
  {id: '3F', position: 'Left wall, third shelf, bottom right', x: 18, y: 56.05, width: 6.8, height: 6.15, photo: null, rack: null},
  {id: '4A', position: 'Left wall, bottom shelf, left half', x: 4.4, y: 71.5, width: 10.2, height: 12.3, photo: null, rack: null},
  {id: '4B', position: 'Left wall, bottom shelf, right half', x: 14.6, y: 71.5, width: 10.2, height: 12.3, photo: null, rack: null},
  {id: '5', position: 'Bottom of map, left', x: 31.6, y: 60.4, width: 7.6, height: 24.4, photo: null, rack: null},
  {id: '6', position: 'Bottom of map, centre-right', x: 70.4, y: 60.4, width: 7.7, height: 24.4, photo: null, rack: null},
  {id: '7', position: 'Bottom of map, far right', x: 88.3, y: 60.4, width: 7.3, height: 24.4, photo: null, rack: null}
];
const SHOP_COUNTERS = [
  {id: 'counter-2', label: 'Counter 2', position: 'Beside the work bench, left of checkout', x: 30.5, y: 22.7, width: 3.6, height: 21.5, photo: 'assets/counter-2.jpg', rack: 'Counter 2'}
];
const SHOP_AREAS = [
  ...SHOP_SHELVES.map(shelf => ({...shelf, route: `shelf-${shelf.id}`, label: `Shelving area ${shelf.id}`, badge: shelf.id})),
  ...SHOP_COUNTERS.map(counter => ({...counter, route: counter.id, badge: 'C2'}))
];

// Positions are percentages of the complete photo. Numbers remain stable when labels change.
// Replace a pin's label/contents here once the contents have been confirmed.
const SHELF_PIN_CONTENTS = {
  '1A': {
    16: 'Bridge Rectifier: 1A 50V and 3A 200V',
    17: 'LEDS/Bargraph',
    18: 'LED 10mm 7-SEG',
    20: 'OP-AMPS (TLO71, TLO72,TLO74,TLO81,TLO82,TLO84), (TDB0139) (OPA177) (LM301, LM307)',
    21: 'OP-AMPS (LF356) (LF357) (LM358) (LM359) (LM361) (LM380) (LM392) (LM393) (LF398) (LF444)'
  }
};
const SHELF_PHOTO_PINS = {
  '3C': [
    {id: 1, x: 38, y: 13, label: 'Top shelf, left side', contents: ''},
    {id: 2, x: 72, y: 13, label: 'Top shelf, right side', contents: ''},
    {id: 3, x: 53, y: 29, label: 'Second shelf above silver boxes', contents: ''},
    {id: 4, x: 53, y: 38, label: 'Shelf immediately above silver boxes', contents: ''},
    {id: 5, x: 55, y: 64, label: 'Middle of silver boxes', contents: ''},
    {id: 6, x: 37, y: 92, label: 'Below silver boxes, left storage', contents: ''},
    {id: 7, x: 66, y: 92, label: 'Below silver boxes, right storage', contents: ''}
  ],
  '2B': [
    {id: 1, x: 70, y: 15, label: 'Top shelf, large box', contents: 'Spare Blue Forensic Gloves'},
    {id: 2, x: 9, y: 41, label: 'Second shelf, left box', contents: 'Quest 2 (handsets and battery)'},
    {id: 3, x: 42, y: 60.8, label: 'Lock Pick Kits shelf', contents: 'Lock Pick Kits'}
  ],
  'counter-2': [
    {id: 1, x: 55, y: 73, label: 'Counter 2 cable tester', contents: 'Cable Tester', description: 'Engineering students may need their cables testing before use.'}
  ],
  '1A': [
    ...[52, 60, 68, 79, 90].map((x, index) => ({id: index + 1, x, y: 13, label: `Top storage stack ${index + 1}`, contents: ''})),
    ...[
      {x: 17, start: 32.2, end: 58.6, label: 'Upper left cabinet'},
      {x: 37.5, start: 32, end: 58.5, label: 'Upper centre-left cabinet'},
      {x: 58, start: 31, end: 58.5, label: 'Upper centre-right cabinet'},
      {x: 81, start: 29.8, end: 58.6, label: 'Upper right cabinet'},
      {x: 20, start: 70.8, end: 91, label: 'Lower left cabinet'},
      {x: 36.5, start: 71.3, end: 92, label: 'Lower centre-left cabinet'},
      {x: 57, start: 71.5, end: 93.2, label: 'Lower centre-right cabinet'},
      {x: 76, start: 71.8, end: 93.8, label: 'Lower right cabinet'}
    ].flatMap((column, columnIndex) => Array.from({length: 10}, (_, row) => ({
      id: 6 + columnIndex * 10 + row,
      x: column.x,
      y: Number((column.start + (column.end - column.start) * row / 9).toFixed(2)),
      label: `${column.label}, drawer ${row + 1}`,
      contents: SHELF_PIN_CONTENTS['1A'][6 + columnIndex * 10 + row] || ''
    })))
  ]
};

function renderPinContents(contents) {
  const text = contents || 'Contents not labelled yet';
  const groups = text.startsWith('OP-AMPS') ? [...text.matchAll(/\(([^)]+)\)/g)].map(match => match[1]) : [];
  if (!groups.length) return `<strong class="pin-contents">${esc(text)}</strong>`;
  const heading = text.slice(0, text.indexOf('(')).trim();
  return `<strong class="pin-contents">${esc(heading)}</strong><span class="pin-parts" role="list">${groups.map(group => `<span role="listitem">${esc(group)}</span>`).join('')}</span>`;
}

function renderShelfPhoto(shelf, area) {
  const pins = SHELF_PHOTO_PINS[shelf.pinSource || shelf.id] || [];
  const photo = `<img src="${esc(shelf.photo)}" alt="Stock on ${esc(area.label)}, ${esc(shelf.position)}">`;
  if (!pins.length) return `<a href="${esc(shelf.photo)}" target="_blank" rel="noopener">${photo}<span class="photo-caption">Open full-size photo</span></a>`;
  return `<p class="photo-instructions">Hover over a numbered pin, use Tab, or tap a pin to see its contents. Labels are ready to be filled in. Scroll sideways on smaller screens.</p><div class="pinned-photo-scroll"><div class="pinned-photo">${photo}${pins.map(pin => `<button type="button" class="photo-pin${pin.x < 15 ? ' pin-edge-left' : pin.x > 85 ? ' pin-edge-right' : ''}${shelf.id === 'counter-2' ? ' photo-pin-large' : ''}" style="left:${pin.x}%;top:${pin.y}%" aria-label="Pin ${pin.id}: ${esc(pin.label)}. ${esc(pin.contents || 'Contents not labelled yet')}${pin.description ? '. Description: ' + esc(pin.description) : ''}"><span class="pin-number">${pin.id}</span><span class="pin-tooltip">${renderPinContents(pin.contents)}${pin.description ? `<span class="pin-description">Description: ${esc(pin.description)}</span>` : ''}<span>Pin ${pin.id}: ${esc(pin.label)}</span></span></button>`).join('')}</div></div><a class="photo-caption" href="${esc(shelf.photo)}" target="_blank" rel="noopener">Open full-size photo</a>`;
}

function renderShopMap() {
  $('mapHotspots').innerHTML = SHOP_AREAS.map(area => `<a class="shelf-hotspot" href="#${area.route}" style="left:${area.x}%;top:${area.y}%;width:${area.width}%;height:${area.height}%" aria-label="View ${esc(area.label)}: ${esc(area.position)}"><span>${area.badge}</span></a>`).join('');
  $('shelfLinks').innerHTML = SHOP_AREAS.map(area => `<a href="#${area.route}" class="shelf-link"><strong>${esc(area.label)}</strong><span>${esc(area.position)}</span></a>`).join('');
}

function showShelfRoute() {
  const hash = ({'#shelf-2A1': '#shelf-2A', '#shelf-2A2': '#shelf-2B', '#shelf-2B1': '#shelf-2C', '#shelf-2B2': '#shelf-2D'})[window.location.hash] || window.location.hash;
  const area = SHOP_AREAS.find(area => `#${area.route}` === hash);
  // Read current asset and rack settings so later configuration edits are reflected.
  const settings = area && (SHOP_SHELVES.find(shelf => `shelf-${shelf.id}` === area.route) || SHOP_COUNTERS.find(counter => counter.id === area.route));
  const shelf = area && {...area, ...settings};
  $('mapOverview').hidden = Boolean(shelf);
  $('shelfView').hidden = !shelf;
  if (!shelf) return;
  $('shelfTitle').textContent = area.label;
  $('shelfPosition').textContent = shelf.position;
  $('shelfPhoto').innerHTML = shelf.photo
    ? renderShelfPhoto(shelf, area)
    : `<div class="photo-placeholder"><span aria-hidden="true">&#9638;</span><strong>${area.route === 'counter-2' ? 'Counter' : 'Shelf'} photo coming soon</strong><p>A photo of this ${area.route === 'counter-2' ? 'counter' : 'shelving area'} will appear here once it has been added.</p></div>`;
  const stock = shelf.rack ? items.filter(product => product.area === shelf.rack) : [];
  $('shelfStock').innerHTML = shelf.rack
    ? `<h4>Stock in ${esc(shelf.rack)}</h4>${stock.length ? `<ul class="shelf-stock-list">${stock.map(product => `<li><strong>${esc(product.name)}</strong><span>${esc(product.sku)} &middot; ${esc(product.shelf)}</span></li>`).join('')}</ul>` : '<p>No products are currently listed for this area.</p>'}`
    : '<p class="meta">The inventory rack for this area has not been identified yet.</p>';
  $('shelfTitle').focus({preventScroll: true});
  $('shop-map').scrollIntoView({block: 'start'});
}

$('shelfPhoto').addEventListener('click', event => {
  const pin = event.target.closest('.photo-pin');
  if (pin) pin.focus();
});
renderShopMap();
window.addEventListener('hashchange', () => {
  showShelfRoute();
  if (window.location.hash === '#shop-map') $('mapTitle').focus({preventScroll: true});
});
showShelfRoute();
