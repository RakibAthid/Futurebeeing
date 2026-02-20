const STORAGE_KEY = "FB_POI_MVP_V1";

// Twekkelerveld (Enschede) – default view + bounding box for fetching OSM context.
// Center approx. 52.23064, 6.86004.
const DEFAULT_CENTER = [52.23064, 6.86004];
const DEFAULT_ZOOM = 15;

// Overpass expects: south,west,north,east
const TWEK_BBOX = { south: 52.2186, west: 6.8420, north: 52.2426, east: 6.8780 };

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

const CATEGORIES = [
  { id: "public_space", label: "Public space" },
  { id: "mobility", label: "Mobility & access" },
  { id: "green_comfort", label: "Green & comfort" },
  { id: "safety", label: "Safety / usability" },
];

const TAGS = [
  { id:"no_shade", label:"No shade" },
  { id:"unsafe_crossing", label:"Unsafe crossing" },
  { id:"parking_pressure", label:"Parking pressure" },
  { id:"unused_space", label:"Unused space" },
  { id:"no_seating", label:"No seating" },
  { id:"poor_play", label:"Poor play" },
  { id:"heat_stress", label:"Heat stress" },
  { id:"poor_lighting", label:"Poor lighting" },
  { id:"conflict", label:"Ped/cycle conflict" },
  { id:"water_constraint", label:"Water-edge constraint" },
];

const SOLUTIONS = [
  { id:"add_shade_trees", label:"Add shade / trees", tags:["no_shade","heat_stress","comfort","green"] },
  { id:"add_seating", label:"Add seating / meeting place", tags:["no_seating","unused_space","social","comfort"] },
  { id:"add_play", label:"Add play element", tags:["poor_play","unused_space","social"] },
  { id:"safer_crossing", label:"Safer crossing", tags:["unsafe_crossing","mobility","safety"] },
  { id:"reduce_parking_shared", label:"Reduce parking / shared space", tags:["parking_pressure","conflict","mobility"] },
  { id:"water_cooling", label:"Water / cooling element", tags:["heat_stress","water","comfort"] },
];

let map, poiLayer, activeMarkerId = null;
let overlays = {};
let overlayLayers = {};
let imageBank = [];

function uid(){
  return "poi_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { pois: [] };
    const parsed = JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.pois)) return { pois: [] };
    return parsed;
  }catch(e){
    return { pois: [] };
  }
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function download(filename, text){
  const a = document.createElement("a");
  a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function el(id){ return document.getElementById(id); }

function setStatus(text){
  el("status").textContent = text;
}

function renderTags(container, selectedIds, onToggle){
  container.innerHTML = "";
  TAGS.forEach(t => {
    const chip = document.createElement("div");
    chip.className = "tag" + (selectedIds.includes(t.id) ? " selected" : "");
    chip.textContent = t.label;
    chip.onclick = () => onToggle(t.id);
    container.appendChild(chip);
  });
}

function renderSolutions(selectEl){
  selectEl.innerHTML = `<option value="">Select…</option>`;
  SOLUTIONS.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    selectEl.appendChild(opt);
  });
}

function renderCategories(selectEl){
  selectEl.innerHTML = "";
  CATEGORIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    selectEl.appendChild(opt);
  });
}

function markerForPoi(poi){
  const m = L.marker([poi.lat, poi.lng], { draggable:false });
  m.on("click", () => openPoi(poi.id));
  return m;
}

function getPoiById(state, id){
  return state.pois.find(p => p.id === id);
}

function clearActive(){
  activeMarkerId = null;
  el("poiForm").reset();
  el("poiId").textContent = "—";
  el("tagChips").innerHTML = "";
  el("contextBox").innerHTML = `<div class="mini">Create a POI by clicking on the map.</div>`;
  el("beforePreview").src = "";
  el("afterPreview").src = "";
  el("afterGrid").innerHTML = "";
  el("selectedAfterLabel").textContent = "None";
  setStatus("Ready");
}

function openPoi(id){
  const state = loadState();
  const poi = getPoiById(state, id);
  if(!poi) return;

  activeMarkerId = id;
  el("poiId").textContent = poi.id;

  el("title").value = poi.title || "";
  el("category").value = poi.category || "public_space";
  el("urgency").value = poi.urgency || "medium";
  el("comment").value = poi.comment || "";
  el("beforeUrl").value = poi.beforeUrl || "";
  el("solution").value = poi.solution || "";
  el("solutionNote").value = poi.solutionNote || "";

  renderTags(el("tagChips"), poi.tags || [], (tagId) => {
    const st = loadState();
    const p = getPoiById(st, id);
    if(!p) return;
    p.tags = p.tags || [];
    if(p.tags.includes(tagId)) p.tags = p.tags.filter(x => x !== tagId);
    else p.tags.push(tagId);
    saveState(st);
    openPoi(id);
  });

  if(poi.beforeDataUrl) el("beforePreview").src = poi.beforeDataUrl;
  else if(poi.beforeUrl) el("beforePreview").src = poi.beforeUrl;
  else el("beforePreview").src = "";

  if(poi.afterImageId){
    const img = imageBank.find(x => x.id === poi.afterImageId);
    if(img){
      el("afterPreview").src = img.url;
      el("selectedAfterLabel").textContent = img.title;
    }
  }else{
    el("afterPreview").src = "";
    el("selectedAfterLabel").textContent = "None";
  }

  const ctx = computeContextSnapshot(poi);
  poi.context = ctx;
  saveState(state);
  renderContext(ctx);
  renderAfterSuggestions(poi);

  setStatus("Editing " + poi.id);
}

function renderContext(ctx){
  const box = el("contextBox");
  const lines = [
    ["Land-use/type", ctx.landType || "unknown"],
    ["Near green", ctx.nearGreen ? `yes (${ctx.distGreenM} m)` : "no"],
    ["Near water", ctx.nearWater ? `yes (${ctx.distWaterM} m)` : "no"],
    ["Near cycle route", ctx.nearCycle ? `yes (${ctx.distCycleM} m)` : "no"],
    ["Near road", ctx.nearRoad ? `yes (${ctx.distRoadM} m)` : "no"],
  ];
  box.innerHTML = `<div class="kv">${lines.map(([k,v]) => `<div>${k}</div><div>${v}</div>`).join("")}</div>`;
}

function roundM(x){
  if(x === null || x === undefined || Number.isNaN(x)) return null;
  return Math.round(x);
}

function computeContextSnapshot(poi){
  const pt = turf.point([poi.lng, poi.lat]);

  const withinType = (fc, propKey="type") => {
    if(!fc || !fc.features) return null;
    for(const f of fc.features){
      if(f.geometry && f.geometry.type === "Polygon"){
        if(turf.booleanPointInPolygon(pt, f)){
          return f.properties?.[propKey] || f.properties?.name || "polygon";
        }
      }
    }
    return null;
  };

  const distanceTo = (fc, types) => {
    if(!fc || !fc.features) return null;
    let best = null;
    for(const f of fc.features){
      if(!f.geometry) continue;
      const gtype = f.geometry.type;
      if(types.includes(gtype)){
        const d = turf.distance(pt, f, { units:"kilometers" }) * 1000;
        if(best === null || d < best) best = d;
      }
    }
    return best;
  };

  const landType = withinType(overlays.green) ? "green_area"
                : withinType(overlays.water) ? "water"
                : "built/unknown";

  const dGreen = distanceTo(overlays.green, ["Polygon"]);
  const dWater = distanceTo(overlays.water, ["Polygon"]);
  const dCycle = distanceTo(overlays.cycling, ["LineString"]);
  const dRoad  = distanceTo(overlays.roads, ["LineString"]);

  const near = (d, thresh) => (d !== null && d <= thresh);

  return {
    landType,
    distGreenM: roundM(dGreen),
    distWaterM: roundM(dWater),
    distCycleM: roundM(dCycle),
    distRoadM:  roundM(dRoad),
    nearGreen: near(dGreen, 120),
    nearWater: near(dWater, 120),
    nearCycle: near(dCycle, 80),
    nearRoad:  near(dRoad, 80),
  };
}

function renderAfterSuggestions(poi){
  const grid = el("afterGrid");
  grid.innerHTML = "";

  const selected = poi.afterImageId || null;

  const wantedTags = new Set([...(poi.tags || [])]);
  const sol = SOLUTIONS.find(s => s.id === poi.solution);
  if(sol) sol.tags.forEach(t => wantedTags.add(t));

  const scored = imageBank.map(img => {
    const overlap = img.tags.filter(t => wantedTags.has(t)).length;
    return { img, score: overlap };
  }).sort((a,b) => b.score - a.score);

  const top = scored.filter(x => x.score > 0).slice(0, 6);
  const list = top.length ? top : scored.slice(0, 6);

  list.forEach(({img}) => {
    const card = document.createElement("div");
    card.className = "thumb" + (selected === img.id ? " selected" : "");
    card.innerHTML = `<img src="${img.url}" alt=""><div class="t">${img.title}</div>`;
    card.onclick = () => {
      const state = loadState();
      const p = getPoiById(state, poi.id);
      if(!p) return;
      p.afterImageId = img.id;
      saveState(state);
      openPoi(poi.id);
    };
    grid.appendChild(card);
  });
}

function bboxString(){
  return `${TWEK_BBOX.south},${TWEK_BBOX.west},${TWEK_BBOX.north},${TWEK_BBOX.east}`;
}

function overpassQuery(kind){
  const b = bboxString();

  if(kind === "green"){
    return `[out:json][timeout:25];(
      way["leisure"="park"](${b}); relation["leisure"="park"](${b});
      way["landuse"~"grass|meadow|recreation_ground|village_green"](${b}); relation["landuse"~"grass|meadow|recreation_ground|village_green"](${b});
      way["natural"~"wood|scrub"](${b}); relation["natural"~"wood|scrub"](${b});
    );out body;>;out skel qt;`;
  }

  if(kind === "water"){
    return `[out:json][timeout:25];(
      way["natural"="water"](${b}); relation["natural"="water"](${b});
      way["waterway"="riverbank"](${b}); relation["waterway"="riverbank"](${b});
      way["amenity"="fountain"](${b});
    );out body;>;out skel qt;`;
  }

  if(kind === "cycling"){
    return `[out:json][timeout:25];(
      way["highway"="cycleway"](${b});
      way["cycleway"](${b});
      way["highway"="path"]["bicycle"!="no"](${b});
    );out body;>;out skel qt;`;
  }

  // roads
  return `[out:json][timeout:25];(
    way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|living_street|unclassified|service"](${b});
  );out body;>;out skel qt;`;
}

async function fetchOverpass(query){
  const body = "data=" + encodeURIComponent(query);
  let lastErr = null;
  for(const endpoint of OVERPASS_ENDPOINTS){
    try{
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body,
      });
      if(!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      return await res.json();
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error("Overpass request failed");
}

async function loadFromOverpass(kind){
  if(!window.osmtogeojson) throw new Error("osmtogeojson not available");
  const raw = await fetchOverpass(overpassQuery(kind));
  const gj = window.osmtogeojson(raw);
  if(!gj || !Array.isArray(gj.features)) throw new Error("Bad OSM→GeoJSON conversion");
  return gj;
}

async function loadOverlays(){
  const names = ["green","water","cycling","roads"];

  // Preferred: real context from OSM (Overpass). Fallback: bundled demo GeoJSON.
  for(const n of names){
    try{
      overlays[n] = await loadFromOverpass(n);
    }catch(e){
      const res = await fetch(`data/${n}.geojson`);
      overlays[n] = await res.json();
    }
  }
}

async function loadImageBank(){
  const res = await fetch("data/image_bank.json");
  imageBank = await res.json();
}

function setupOverlayLayers(){
  const stylePoly = (color) => ({ color, weight:2, fillOpacity:0.15 });
  const styleLine = (color) => ({ color, weight:3, opacity:0.8 });

  overlayLayers.green = L.geoJSON(overlays.green, { style: stylePoly("#2ca25f") });
  overlayLayers.water = L.geoJSON(overlays.water, { style: stylePoly("#2b8cbe") });
  overlayLayers.cycling = L.geoJSON(overlays.cycling, { style: styleLine("#7b3294") });
  overlayLayers.roads = L.geoJSON(overlays.roads, { style: styleLine("#555") });
}

function setLayerVisible(key, visible){
  if(!overlayLayers[key]) return;
  if(visible) overlayLayers[key].addTo(map);
  else map.removeLayer(overlayLayers[key]);
  if(activeMarkerId) openPoi(activeMarkerId);
}

function renderLayerToggles(){
  const box = el("layerToggles");
  const items = [
    {key:"green", label:"Green / trees"},
    {key:"water", label:"Water"},
    {key:"cycling", label:"Cycling"},
    {key:"roads", label:"Roads"},
  ];
  box.innerHTML = items.map(it => {
    return `<label style="display:flex; gap:10px; align-items:center; margin:8px 0; color:#333;">
      <input type="checkbox" id="layer_${it.key}" checked> <span>${it.label}</span>
    </label>`;
  }).join("");

  items.forEach(it => {
    const cb = el(`layer_${it.key}`);
    cb.onchange = () => setLayerVisible(it.key, cb.checked);
  });
}

function renderPoiList(){
  const state = loadState();
  el("poiCount").textContent = `${state.pois.length} POIs`;
}

function initMap(){
  map = L.map("map", { zoomControl:true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  poiLayer = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    const state = loadState();
    const id = uid();
    const poi = {
      id,
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      title: "",
      category: "public_space",
      tags: [],
      urgency: "medium",
      comment: "",
      beforeUrl: "",
      beforeDataUrl: "",
      solution: "",
      solutionNote: "",
      afterImageId: "",
      context: {},
      createdAt: new Date().toISOString(),
    };
    state.pois.push(poi);
    saveState(state);

    const m = markerForPoi(poi);
    m._poiId = id;
    m.addTo(poiLayer);

    openPoi(id);
    renderPoiList();
  });
}

function loadMarkersFromState(){
  poiLayer.clearLayers();
  const state = loadState();
  state.pois.forEach(poi => {
    const m = markerForPoi(poi);
    m._poiId = poi.id;
    m.addTo(poiLayer);
  });
  renderPoiList();
}

function bindUI(){
  renderCategories(el("category"));
  renderSolutions(el("solution"));

  el("btnNew").onclick = () => clearActive();

  el("btnDelete").onclick = () => {
    if(!activeMarkerId) return;
    const state = loadState();
    state.pois = state.pois.filter(p => p.id !== activeMarkerId);
    saveState(state);
    loadMarkersFromState();
    clearActive();
    renderPoiList();
  };

  el("btnSave").onclick = () => {
    if(!activeMarkerId) return;
    const state = loadState();
    const poi = getPoiById(state, activeMarkerId);
    if(!poi) return;

    poi.title = el("title").value.trim();
    poi.category = el("category").value;
    poi.urgency = el("urgency").value;
    poi.comment = el("comment").value.trim();
    poi.beforeUrl = el("beforeUrl").value.trim();
    poi.solution = el("solution").value;
    poi.solutionNote = el("solutionNote").value.trim();

    if(poi.beforeUrl) poi.beforeDataUrl = "";
    poi.context = computeContextSnapshot(poi);

    saveState(state);
    setStatus("Saved");
    openPoi(activeMarkerId);
    renderPoiList();
  };

  el("beforeFile").addEventListener("change", (ev) => {
    if(!activeMarkerId) return;
    const file = ev.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const state = loadState();
      const poi = getPoiById(state, activeMarkerId);
      if(!poi) return;
      poi.beforeDataUrl = reader.result;
      poi.beforeUrl = "";
      el("beforeUrl").value = "";
      saveState(state);
      openPoi(activeMarkerId);
    };
    reader.readAsDataURL(file);
  });

  el("btnExport").onclick = () => {
    const state = loadState();
    download("poi_export.json", JSON.stringify(state, null, 2));
  };

  el("btnClearAll").onclick = () => {
    if(!confirm("Clear all saved POIs in this browser?")) return;
    localStorage.removeItem(STORAGE_KEY);
    loadMarkersFromState();
    clearActive();
    renderPoiList();
  };
}

async function main(){
  setStatus("Loading…");
  await loadImageBank();
  await loadOverlays();

  initMap();
  setupOverlayLayers();
  renderLayerToggles();

  ["green","water","cycling","roads"].forEach(k => setLayerVisible(k, true));

  bindUI();
  loadMarkersFromState();
  clearActive();
  setStatus("Ready");
  renderPoiList();
}

main().catch(err => {
  console.error(err);
  setStatus("Error loading app");
});