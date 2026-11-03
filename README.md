# BEC TECH Stock Locator

A browser-based helpdesk inventory for finding engineering and computing materials and components in the BEC TECH room. Open `index.html` for Find stock, `product-inventory.html` for the full editable inventory, or `shop-floor-map.html` for the interactive map. The navigation links switch between these pages. Serve all pages from the same website address to share browser-saved inventory.

The initial inventory contains 104 entries (C001–C104) imported from `Component_Inventory.pdf`, including categories, rack/shelf/container/drawer locations, status and notes. `inventory.js` contains this starting data; `app.js` handles search and editing.

Search by component, inventory ID, category, location or notes. Quantities omitted in the PDF remain unrecorded, rather than being treated as zero. The Known units total counts only recorded quantities (initially 106 units across seven entries). Uncertain labels and repeated components with different IDs are preserved as listed in the PDF.

The separate `describe-component.html` page contains the Describe your component form, accessible from the navigation on every page. `component-finder.js` ranks the current browser inventory using exact keywords and common purpose descriptions (for example distance, temperature/humidity, or building without soldering). It displays up to five possible matches with reasons and storage locations. Unrecognised descriptions show a no-match message. This runs locally without an AI service or API key; it does not verify electrical compatibility. Update `COMPONENT_RULES` to support additional descriptions. Include `component-finder.js` when publishing.

Changes are saved in this browser on this device, not shared between users. Existing entries saved by the earlier prototype are retained alongside the imported inventory on first load. Later visits use the saved list, preserving edits and deletions. Keep all four HTML pages, `theme.css`, `inventory.js`, `app.js`, `shop-map.js` and the `assets` directory together when publishing.

The Shop floor map uses `assets/shop-floor-plan.png` with individually clickable shelf sections. Area 1 is split into two side-by-side blocks, 1A (left) and 1B (right), each with its own photo setting. Areas 2–4 continue down the left wall; areas 5–7 run along the bottom from left to right. Each opens a dedicated photo view, with a placeholder until photos are supplied. Equivalent links below the map support mobile and keyboard navigation. Browser Back returns to the previous view, and shelf URLs such as `shop-floor-map.html#shelf-3C` can be bookmarked.

`shop-map.js` holds the shelf labels, percentage-based map positions, photo paths and optional rack assignments. To add a photo, save it in `assets` and set the corresponding `photo` value to its relative path. Leave `rack` unassigned until its real location is confirmed; assigning an exact inventory area such as `Rack 3A` also displays its stock. Include `shop-map.js` when publishing.

Counter 2 is also clickable (C2 on the map). Its photo can be set in SHOP_COUNTERS in shop-map.js. Products with Rack / area set to Counter 2 appear in its stock list.

Area 1A includes a photo with 85 numbered pins: 1–5 identify the top storage stacks, 6–45 identify the upper drawers, and 46–85 identify the lower drawers. Drawer numbers run top to bottom within each cabinet, then left to right across cabinets. Hover, focus with Tab, or tap a pin to see its label and contents. The photo scrolls horizontally on small screens to keep pins usable. `SHELF_PHOTO_PINS` in `shop-map.js` stores percentage positions and placeholder contents; update each pin's `contents` (or `label`) when confirmed. No contents have been inferred from the photograph.
