import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { financialInsightsForApp } from '../src/finance/financialInsights.js';
import { assistantSchedulesForApp } from '../src/finance/assistantSchedules.js';
import { assistantFinancialPositionForApp } from '../src/finance/assistantFinancialPosition.js';

// Reproduce a Realtime callback that outlives the render which created it.
const source = fs.readFileSync('src/sezioni.tsx', 'utf8');
const ast = ts.createSourceFile('sezioni.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const matches = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'realtimeTurnDirective') matches.push(node);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(matches.length, 1);
const code = ts.transpileModule(matches[0].getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  const snapshot = {
    today: '2026-11-10', aiDataAccess: 'full', currency: 'EUR',
    month: 10, year: 2026, curMonthKey: '2026-11', monthStartDay: 1,
    expenses: [{ id: 'old', desc: 'Old expense', amount: 100, date: '2026-11-02', catId: 1 }],
    income: [], cats: [{ id: 1, name: 'Food' }], methods: [], goals: [],
    patrimonioEntries: [{ id: 'bank', name: 'Bank' }], patrimonioValues: { bank: 1000 }
  };
  const env = {
    c: snapshot, assistantLiveContextRef: { current: snapshot },
    lang: 'it', lastAssistantUserLanguageRef: { current: 'it' },
    lastVoiceUserRequestRef: { current: 'spese di novembre 2026' },
    todayStr: () => '2026-11-10', assistantLanguageName: () => 'Italian',
    financialInsightsForApp, assistantSchedulesForApp, assistantFinancialPositionForApp
  };
  const directive = new Function('env', `with(env){${code};return realtimeTurnDirective;}`)(env);
  return { env, directive };
}

function evidence(directive) {
  const result = {};
  for (const field of ['financialInsights', 'financialSchedules', 'financialPosition']) {
    const prefix = 'Updated ' + field + ' for this turn';
    const start = directive.indexOf(prefix);
    assert(start >= 0);
    const jsonStart = directive.indexOf('{', start);
    const next = directive.indexOf(' Updated ', jsonStart);
    result[field] = JSON.parse(directive.slice(jsonStart, next < 0 ? undefined : next).trim());
  }
  return result;
}

test('Realtime reads the current expense and wealth state after a rerender', () => {
  const { env, directive } = fixture();
  const before = evidence(directive({ language: 'it', languageName: 'Italian' }));
  env.assistantLiveContextRef.current = {
    ...env.c,
    expenses: [{ ...env.c.expenses[0], amount: 425 }],
    patrimonioValues: { bank: 2500 }
  };
  const after = evidence(directive({ language: 'it', languageName: 'Italian' }));
  assert.notDeepEqual(after.financialInsights, before.financialInsights);
  assert.equal(after.financialPosition.patrimony.total, 2500);
  assert.equal(env.c.patrimonioValues.bank, 1000, 'The old render snapshot remains unchanged');
});

test('Realtime respects a reduced privacy setting even when the initial callback had full access', () => {
  const { env, directive } = fixture();
  env.assistantLiveContextRef.current = { ...env.c, aiDataAccess: 'summary' };
  const result = evidence(directive({ language: 'it', languageName: 'Italian' }));
  assert.equal(result.financialInsights.accessLevel, 'summary');
  assert.equal(result.financialSchedules.reason, 'FULL_DATA_ACCESS_REQUIRED');
  assert.equal(result.financialPosition.reason, 'FULL_DATA_ACCESS_REQUIRED');
  for (const value of Object.values(result)) {
    assert(!JSON.stringify(value).includes('Old expense'));
    assert(!JSON.stringify(value).includes('Bank'));
  }
});
