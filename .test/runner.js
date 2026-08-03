// Test runner: assembles harness + app JS and asserts the full lifecycle.
// Map data is injected by the Python driver (replaces __MAP_DATA__).

load("harness.js");
getEl("map-data").textContent = __MAP_DATA__;
load("app.js");

let __failed = false;
function log(msg){ try { print(msg); } catch(e){} try { console.log(msg); } catch(e){} }
function assert(cond, msg){
  if (!cond){ __failed = true; throw new Error("ASSERT FAILED: " + msg); }
  log("  \u2713 " + msg);
}

(async () => {
  log("structure:");
  const pathCount = registry.filter(e => e.tag === "path" && e.attrs["data-id"]).length;
  const labelCount = registry.filter(e => e.tag === "text").length;
  const chipCount = registry.filter(e => e._cls.has("chip")).length;
  assert(pathCount === 51, "51 map paths");
  assert(labelCount === 42, "42 state labels");
  assert(chipCount === 9, "9 sidebar chips");
  assert(TOTAL_EV === 538, "EV total 538");

  log("settings:");
  settings.provider = "openai"; settings.apiKey = "sk-test-123"; settings.model = "gpt-4o"; settings.concurrency = 16;
  saveSettings();
  const s2 = JSON.parse(localStorage.getItem("ae_settings"));
  assert(s2.provider === "openai" && s2.apiKey === "sk-test-123", "settings persist to localStorage");

  log("ticket generation:");
  await generateTicket("dem", getEl("gen-dem"));
  assert(getEl("dem-candidate").value === "Candice Morales", "dem candidate filled from model JSON");
  assert(getEl("dem-desc").value.includes("Strengths"), "dem platform+strengths written");
  await generateTicket("rep", getEl("gen-rep"));
  assert(getEl("rep-candidate").value === "Marcus Sterling", "rep candidate filled");
  assert($("#rep-name")._text === "Marcus Sterling", "scoreboard name updates");
  await generateSotu(getEl("gen-sou"));
  assert(getEl("sotu").value.length > 30, "SOTU paragraph written");
  assert(ticketsReady(), "simulate button unlocks");

  log("simulation:");
  const t0 = Date.now();
  await simulate();
  assert(sim.winner !== null, "a winner is declared");
  assert(sim.demEV + sim.repEV === 538, "EVs sum to 538 (got " + (sim.demEV + sim.repEV) + ")");
  const called = Object.values(STATES).filter(s => s.status === "called").length;
  assert(called === 51, "all 51 states called (got " + called + ")");
  assert(Number(getEl("dem-ev")._text) === sim.demEV, "scoreboard dem EV matches sim");
  assert(Number(getEl("rep-ev")._text) === sim.repEV, "scoreboard rep EV matches sim");
  const feedItems = getEl("feed-items").children.length;
  assert(feedItems > 50, "wire has " + feedItems + " entries");
  const gradientDefs = registry.filter(e => e.tag === "linearGradient").length;
  assert(gradientDefs > 0, "reporting gradients created");
  await sleep(1500);
  assert(getEl("win-overlay")._cls.has("open"), "winner modal opens");
  assert(getEl("win-title")._html.includes("elects"), "winner modal names the winner");
  log("simulation took " + ((Date.now() - t0)/1000).toFixed(1) + "s (stubbed LLM)");

  log("state modal + chat:");
  openState("OH");
  assert(getEl("st-name")._text === "Ohio", "state modal opens for OH");
  assert(getEl("st-narrative-text")._text.includes("voters of Ohio"), "deliberation narrative shown");
  getEl("st-input").value = "Why did the economy decide it for you?";
  await sendChat();
  assert(chatLog.length === 2 && chatLog[1].role === "assistant", "chat roundtrip appended");
  openState("AK");
  assert(getEl("st-narrative-text")._text.includes("voters of Alaska"), "AK narrative shown");

  log("error handling:");
  failNext = true;
  await generateTicket("dem", getEl("gen-dem"));
  assert(getEl("toast")._text.includes("stub boom"), "API failure surfaces in toast");
  assert(getEl("dem-candidate").value === "Candice Morales", "failed gen leaves fields intact");

  log("parsing:");
  assert(parseJSON("```json\n{\"a\":1}\n```").a === 1, "fenced JSON parsed");
  assert(parseJSON("prefix text {\"a\":2} suffix").a === 2, "embedded JSON parsed");

  log("\nALL TESTS PASSED");
  quit(0);
})().catch(e => {
  log("TEST FAILURE: " + e.message);
  if (e.stack) log(e.stack.split("\n").slice(0,6).join("\n"));
  quit(1);
});
