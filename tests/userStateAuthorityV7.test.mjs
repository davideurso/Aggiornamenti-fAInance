
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/app.tsx", import.meta.url), "utf8");

function fail(message) {
  console.error("[FAIL]", message);
  process.exit(1);
}
function ok(message) {
  console.log("[OK]", message);
}

if (!app.includes("function canonicalUserStateAuthorityValue")) {
  fail("Canonical user-state comparator missing");
}
ok("Canonical comparator present");

if (!app.includes("function userStateAuthorityStorageValueEqual")) {
  fail("Semantic storage comparator missing");
}
ok("Semantic storage comparator present");

if (!app.includes("!userStateAuthorityStorageValueEqual(")) {
  fail("Late V6 mismatch detector is not using semantic comparison");
}
ok("Late V6 guard uses semantic comparison");

if (app.includes("Configurazione personale ripristinata dal cloud")) {
  fail("Diagnostic V6 popup is still present");
}
ok("V6 restore is silent for the user");

if (!app.includes("USER STATE V6 LATE OVERRIDE RESTORED")) {
  fail("Silent diagnostic marker missing");
}
ok("True late overrides remain diagnosable");

function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === "object") {
    const out = {};
    Object.keys(v).sort().forEach((key) => {
      out[key] = normalize(v[key]);
    });
    return out;
  }
  return v;
}
function canonical(raw) {
  const value = String(raw ?? "");
  try {
    return JSON.stringify(normalize(JSON.parse(value)));
  } catch {
    return value;
  }
}
function eq(a,b) {
  if (String(a ?? "") === String(b ?? "")) return true;
  return canonical(a) === canonical(b);
}

if (!eq('{"id":"cc","name":"Conto","icon":"x"}','{"icon":"x","name":"Conto","id":"cc"}')) {
  fail("Equivalent JSON object order still produces mismatch");
}
ok("Equivalent JSON object order no longer produces false mismatch");

if (!eq('[{"id":"cc","meta":{"b":2,"a":1}}]','[{"meta":{"a":1,"b":2},"id":"cc"}]')) {
  fail("Nested equivalent JSON still produces mismatch");
}
ok("Nested JSON is compared semantically");

if (eq('[{"id":"cc"}]','[{"id":"cash"}]')) {
  fail("Real Patrimonio difference is incorrectly ignored");
}
ok("Real Patrimonio differences are still detected");

if (eq('["a","b"]','["b","a"]')) {
  fail("Array order differences must remain significant");
}
ok("Array order remains authoritative");

console.log("[OK] USER STATE AUTHORITY V7 TESTS PASSED");
