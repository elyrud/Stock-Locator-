// Local matching rules. Add descriptions here as students try new wording.
const COMPONENT_RULES = [
  {when: /\b(distance|far|proximity|obstacle|nearby)\b/, target: /ultrasonic|distance sensor/, reason: 'Measures distance or detects nearby objects'},
  {when: /\b(temperature|temp|hot|cold|heat)\b/, target: /temp|thermistor|bme280|dht|aht20/, reason: 'Measures temperature'},
  {when: /\b(humidity|humid)\b/, target: /humidity|dht|aht20|bme280/, reason: 'Measures air humidity'},
  {when: /\b(soil|plant|watering)\b/, target: /soil/, reason: 'Detects moisture in soil'},
  {when: /\b(weight|weigh|force|strain|load)\b/, target: /weight|load|strain|force sensing/, reason: 'Measures weight or applied force'},
  {when: /\b(movement|motion|moving|presence)\b/, target: /pir|infrared motion|accelerometer/, reason: 'Detects movement'},
  {when: /\b(rotate|rotation|angle|position|servo)\b/, target: /servo|rotary encoder/, reason: 'Controls rotation or measures rotational position'},
  {when: /\b(motor|spin|spinning)\b/, target: /motor/, reason: 'Provides rotational movement'},
  {when: /\b(light|brightness|dark|daylight)\b/, target: /ldr|light dependent|light sensor/, reason: 'Detects light levels'},
  {when: /\b(colour|color)\b/, target: /colour sensor/, reason: 'Detects colour'},
  {when: /\b(glow|illuminate|indicator|led|leds)\b/, target: /led/, reason: 'Produces light or provides an indicator'},
  {when: /\b(screen|display|text|characters)\b/, target: /lcd|oled|display/, reason: 'Displays information'},
  {when: /\b(sound|audio|music|speaker)\b/, target: /speaker|buzzer|audio amp/, reason: 'Produces or amplifies sound'},
  {when: /\b(record|voice|microphone|mic)\b/, target: /microphone|mic breakout/, reason: 'Captures sound'},
  {when: /\b(camera|video|photo|photograph|webcam)\b/, target: /camera|webcam/, reason: 'Captures images or video'},
  {when: /\b(wireless|bluetooth|radio)\b/, target: /bluetooth|zigbee|esp32/, reason: 'Supports wireless communication'},
  {when: /\b(gps|satellite|coordinates|navigation)\b/, target: /gps/, reason: 'Receives satellite positioning information'},
  {when: /\b(fingerprint|fingerprints)\b/, target: /fingerprint/, reason: 'Reads fingerprints'},
  {when: /\b(heart|heartbeat|pulse|oxygen)\b/, target: /pulse/, reason: 'Senses pulse or blood oxygen signals'},
  {when: /\b(gas|smoke|air quality|pollution)\b/, target: /gas sensor|air monitoring/, reason: 'Senses gases or monitors air quality'},
  {when: /\b(magnet|magnetic)\b/, target: /hall effect|reed switch/, reason: 'Detects a magnetic field'},
  {when: /\b(solderless|breadboard|prototype|prototyping|without soldering|no soldering)\b/, target: /breadboard/, reason: 'Builds temporary circuits without soldering'},
  {when: /\b(button|press|push|switch)\b/, target: /tactile|button|dip switch|touch switch/, reason: 'Provides a button or switch input'},
  {when: /\b(microcontroller|programmable|arduino|coding)\b/, target: /arduino|pico board|esp32/, reason: 'Provides a programmable controller'},
  {when: /\b(power|voltage|supply|battery|batteries)\b/, target: /power supply|battery|power bank|dc\/dc/, reason: 'Supplies or converts electrical power'},
  {when: /\b(wires|wire|jumper|connect|connecting)\b/, target: /ribbon|jumper|dupont|connector|header pin/, reason: 'Connects circuit components'}
];
const FINDER_STOP_WORDS = new Set('i me my we our a an the to for of in on at it its is are that this something thing component device need want looking find please can could would should with and or how what which do does use using make measure detect sensor help before students student'.split(' '));
function finderText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function findComponents(description, inventory) {
  const query = finderText(description);
  const tokens = [...new Set(query.split(' ').filter(word => word.length > 1 && !FINDER_STOP_WORDS.has(word)))];
  if (!tokens.length) return [];
  const rules = COMPONENT_RULES.filter(rule => rule.when.test(query));
  return inventory.map(product => {
    const name = finderText(product.name);
    const text = finderText([product.name, product.sku, product.category, product.notes].join(' '));
    const words = new Set(text.split(' '));
    const matched = tokens.filter(token => words.has(token));
    const reasons = rules.filter(rule => rule.target.test(product.name.toLowerCase())).map(rule => rule.reason);
    const exact = name === query || finderText(product.sku) === query;
    const score = (exact ? 100 : 0) + matched.length * 4 + reasons.length * 12;
    return {product, score, reasons: [...new Set(reasons)], matched};
  }).filter(result => result.score > 0)
    .sort((a,b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).slice(0,5);
}
function renderComponentSuggestions() {
  const description = $('componentDescription').value.trim();
  const results = findComponents(description, items);
  $('componentSuggestions').innerHTML = !description
    ? '<p>Describe what you need the component to do first.</p>'
    : !results.length
      ? '<p>No clear matches found. Try mentioning what it measures or does, such as distance, temperature or movement. You can also use the stock search below or ask at the helpdesk.</p>'
      : `<h3>Possible matches</h3><p class="meta">Compare these suggestions with your project requirements. Ask at the helpdesk if you are unsure.</p><div class="suggestion-list">${results.map(({product,reasons,matched}) => `<article class="component-suggestion"><h4>${esc(product.name)}</h4><p>${esc(reasons.join('. ') || 'Matches: ' + matched.join(', '))}</p><p class="meta">${esc(product.sku || 'No ID')} &middot; ${esc(product.category || 'Uncategorised')}</p><div class="location"><span>Stored at</span><b>${esc(product.area || 'Area not recorded')}</b><span>${esc(product.shelf || 'Shelf not recorded')}</span></div><a class="suggestion-map-link" href="shop-floor-map.html">Open shop floor map &rarr;</a></article>`).join('')}</div>`;
}
if ($('componentFinder')) {
  $('componentFinder').addEventListener('submit', event => { event.preventDefault(); renderComponentSuggestions(); });
  $('descriptionExamples').addEventListener('click', event => {
    const button = event.target.closest('button[data-description]');
    if (!button) return;
    $('componentDescription').value = button.dataset.description;
    renderComponentSuggestions();
  });
}
