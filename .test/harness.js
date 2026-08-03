// DOM shim + LLM stub harness for running american-experiment/app JS in jsc.
// Usage: jsc harness.js < app.js

// ---- tiny DOM shim ----
const registry = [];
function mkEl(tag = "div") {
  const el = {
    tag, children: [], parent: null, _cls: new Set(), attrs: {}, dataset: {},
    style: {}, _text: "", _html: "",
    value: "", placeholder: "", disabled: false,
    classList: {
      add: (...c) => c.forEach(x => el._cls.add(x)),
      remove: (...c) => c.forEach(x => el._cls.delete(x)),
      toggle: (c, f) => { if (f === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else f ? el._cls.add(c) : el._cls.delete(c); },
      contains: c => el._cls.has(c)
    },
    appendChild(c) { c.parent = el; el.children.push(c); return c; },
    append(...cs) { cs.forEach(c => el.appendChild(c)); },
    remove() { if (el.parent) { const i = el.parent.children.indexOf(el); if (i >= 0) el.parent.children.splice(i, 1); } },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener() {},
    closest(sel) { let n = el.parent; while (n) { if (sel === ".overlay" && n._cls.has("overlay")) return n; n = n.parent; } return null; },
    get className() { return [...el._cls].join(" "); },
    set className(v) { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    set innerHTML(v) { el._html = String(v); el.children = []; },
    get innerHTML() { return el._html; },
    set textContent(v) { el._text = String(v); el.children = []; },
    get textContent() { return el._text; },
  };
  registry.push(el);
  return el;
}
const byId = {};
function getEl(id) { return (id in byId) ? byId[id] : null; }
function registerEl(id, el){ byId[id] = el; }
function qs(sel) {
  sel = String(sel).trim();
  if (sel.startsWith("#")) return getEl(sel.slice(1));
  if (sel.includes(", ")) {
    const parts = sel.split(",").map(s => s.trim());
    for (const p of parts) { if (p.startsWith(".")) { const hit = registry.find(e => e._cls.has(p.slice(1))); if (hit) return hit; } }
    return null;
  }
  if (sel.startsWith(".")) return registry.find(e => e._cls.has(sel.slice(1))) || null;
  return null;
}
function qsa(sel) {
  sel = String(sel).trim();
  if (sel.startsWith("#")) return [getEl(sel.slice(1))];
  if (sel.includes(", ")) {
    const out = [];
    sel.split(",").map(s => s.trim()).forEach(p => { if (p.startsWith(".")) registry.forEach(e => { if (e._cls.has(p.slice(1))) out.push(e); }); });
    return out;
  }
  if (sel.startsWith(".")) return registry.filter(e => e._cls.has(sel.slice(1)));
  return [];
}
const document = {
  getElementById: getEl,
  querySelector: qs,
  querySelectorAll: qsa,
  createElement: t => mkEl(t),
  createElementNS: (ns, t) => mkEl(t),
  body: mkEl("body"),
  addEventListener() {},
};
const localStorage = (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
const navigator = { clipboard: { writeText: async () => {} } };
if (typeof setInterval === "undefined") { var setInterval = function(){ return 0; }; }
if (typeof clearTimeout === "undefined") { var clearTimeout = function(){}; }
if (typeof setTimeout === "undefined") { var setTimeout = function(fn){ fn(); return 0; }; }

// ---- LLM stub ----
let llmCalls = [];
let failNext = false;
async function fetch(url, opts) {
  const body = JSON.parse(opts.body);
  const isAnthropic = url.includes("anthropic");
  const msgs = (body.messages ? body.messages.map(m => m.content) : []).join("\n") + "\n" + (body.system || "");
  llmCalls.push({ url, msgs });
  if (failNext) { failNext = false; return { ok: false, status: 500, json: async () => ({ error: { message: "stub boom" } }) }; }
  let content;
  if (msgs.includes("Reply with exactly one word: OK")) {
    content = "OK";
  } else if (msgs.includes("agent swarm simulating the voters")) {
    const m = /simulating the voters of ([^.]+?) in a/.exec(msgs);
    const name = m ? m[1] : "Ohio";
    // Deterministic: 60/40 for Democrats -> clear dem win (320 EVs), exercised deterministically.
    const dem = 60;
    const winner = dem >= 50 ? "dem" : "rep";
    content = JSON.stringify({
      winner,
      dem_share: +dem.toFixed(1),
      rep_share: +(100 - dem).toFixed(1),
      narrative: `The voters of ${name} weighed the economy against social issues. Turnout was decisive.`
    });
  } else if (msgs.includes("White House speechwriter")) {
    content = "The state of our Union is strong. We face real challenges — the cost of living, wars abroad, and a fraying social fabric — but we meet them together.";
  } else if (msgs.includes("campaign architect")) {
    content = JSON.stringify({
      candidate: msgs.includes("Democratic") ? "Candice Morales" : "Marcus Sterling",
      mate: msgs.includes("Democratic") ? "David Okafor" : "Elena Vasquez",
      platform: "A pragmatic agenda for the middle class.",
      strengths: "Broad coalition appeal, strong fundraising.",
      weaknesses: "Perceived as establishment, thin on specifics."
    });
  } else if (msgs.includes("agent swarm simulating the voters")) {
    const m = /simulating the voters of ([^.]+?) in a/.exec(msgs);
    const name = m ? m[1] : "Ohio";
    // Deterministic: 60/40 for Democrats -> clear dem win (320 EVs), exercised deterministically.
    const dem = 60;
    const winner = dem >= 50 ? "dem" : "rep";
    content = JSON.stringify({
      winner,
      dem_share: +dem.toFixed(1),
      rep_share: +(100 - dem).toFixed(1),
      narrative: `The voters of ${name} weighed the economy against social issues. Turnout was decisive.`
    });
  } else if (msgs.includes("simulated electorate")) {
    content = "We voted the way we did because the kitchen-table issues cut deepest here.";
  } else {
    content = "OK";
  }
  return {
    ok: true, status: 200,
    json: async () => isAnthropic
      ? { content: [{ type: "text", text: content }] }
      : { choices: [{ message: { content } }] }
  };
}
