import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

function loadModule(file) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React, esModuleInterop: true
    }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', output)(name => {
    assert.equal(name, 'react', 'Formatting has no added runtime dependencies');
    return React;
  }, module.exports, module);
  return module.exports;
}

const { AssistantMessage, assistantSpeechText } = loadModule('src/ui/AssistantMessage.tsx');
const logic = loadModule('src/assistantLogic.ts');

function nodes(value, type) {
  if (Array.isArray(value)) return value.flatMap(item => nodes(item, type));
  if (!React.isValidElement(value)) return [];
  return [...(!type || value.type === type ? [value] : []), ...nodes(value.props.children, type)];
}
function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).join('');
  if (React.isValidElement(value)) return textOf(value.props.children);
  return value == null || typeof value === 'boolean' ? '' : String(value);
}

test('paragraphs preserve single line breaks and separate blank-line paragraphs', () => {
  const view = AssistantMessage({ text: 'Primo paragrafo.\nSeconda riga.\n\nSecondo paragrafo.' });
  const paragraphs = nodes(view, 'p');
  assert.equal(paragraphs.length, 2);
  assert.equal(textOf(paragraphs[0]), 'Primo paragrafo.\nSeconda riga.');
  assert.equal(paragraphs[0].props.style.whiteSpace, 'pre-wrap');
  assert.equal(textOf(paragraphs[1]), 'Secondo paragrafo.');
});

test('expense bullets keep titles bold and amounts as ordinary text', () => {
  const view = AssistantMessage({ text: '- **Supermercato**: 52,00 €\n- **Benzina**: 35,40 €' });
  const items = nodes(view, 'li');
  assert.equal(nodes(view, 'ul').length, 1);
  assert.equal(items.length, 2);
  assert.deepEqual(nodes(view, 'strong').map(textOf), ['Supermercato', 'Benzina']);
  assert.deepEqual(items.map(textOf), ['Supermercato: 52,00 €', 'Benzina: 35,40 €']);
  assert.equal(items[0].props.style.fontWeight, 400);
  assert.equal(items[0].props.children.at(-1), ': 52,00 €');
});

test('existing bullet characters and Markdown bullet markers share one list', () => {
  const view = AssistantMessage({ text: '• Primo\n- Secondo\n* Terzo\n+ Quarto' });
  assert.equal(nodes(view, 'ul').length, 1);
  assert.deepEqual(nodes(view, 'li').map(textOf), ['Primo', 'Secondo', 'Terzo', 'Quarto']);
});

test('numbered lists accept period, parenthesis and period-parenthesis markers', () => {
  const view = AssistantMessage({ text: '3. **Apri Storico**\n4) Tocca Filtra\n5.) Scegli Rateizzato' });
  assert.equal(nodes(view, 'ol').length, 1);
  assert.equal(nodes(view, 'ol')[0].props.start, 3);
  assert.deepEqual(nodes(view, 'li').map(textOf), ['Apri Storico', 'Tocca Filtra', 'Scegli Rateizzato']);
});

test('numbered lists preserve zero and nonconsecutive source numbers', () => {
  const view = AssistantMessage({ text: '0. Zero\n1. Primo\n3. Terzo' });
  assert.equal(nodes(view, 'ol')[0].props.start, 0);
  assert.deepEqual(nodes(view, 'li').map(item => item.props.value), [0, 1, 3]);
});

test('blank lines between list items and an indented continuation keep all content', () => {
  const view = AssistantMessage({ text: '- **Assicurazione**: 120,00 €\n  Quota di novembre.\n\n- **Corso**: 80,00 €\n\nNota finale.' });
  assert.equal(nodes(view, 'ul').length, 1);
  assert.equal(textOf(nodes(view, 'li')[0]), 'Assicurazione: 120,00 €\nQuota di novembre.');
  assert.equal(textOf(nodes(view, 'p')[0]), 'Nota finale.');
});

test('plain prose and monetary decimals do not become invented expenses or lists', () => {
  for (const text of ['Spesa 10 €; Benzina 20 €.', '1.234,56 € disponibili', '2026-11-10: spesa']) {
    const view = AssistantMessage({ text });
    assert.equal(nodes(view, 'li').length, 0);
    assert.equal(nodes(view, 'strong').length, 0);
    assert.equal(textOf(view), text);
  }
});

test('HTML and unsafe links are React text nodes with no active elements or attributes', () => {
  const text = '<img src=x onerror=alert(1)>\n<script>alert(2)</script>\n[Apri](javascript:alert(3))';
  const view = AssistantMessage({ text });
  assert.equal(textOf(view), text);
  for (const element of nodes(view)) {
    assert(['div', 'p'].includes(element.type));
    assert.deepEqual(Object.keys(element.props).sort(), ['children', 'style']);
    assert.equal(element.props.dangerouslySetInnerHTML, undefined);
    assert.equal(element.props.href, undefined);
  }
});

test('malicious text inside emphasis is still literal React text', () => {
  const title = '<svg onload=alert(1)>';
  const view = AssistantMessage({ text: '- **' + title + '**: 12,00 €' });
  assert.equal(nodes(view, 'strong')[0].props.children, title);
  assert.equal(nodes(view).some(element => element.type === 'svg'), false);
});

test('streaming renders an unfinished title without dropping its content', () => {
  const partial = AssistantMessage({ text: '- **Assicurazione', streaming: true });
  assert.equal(textOf(partial), 'Assicurazione');
  assert.equal(textOf(nodes(partial, 'strong')[0]), 'Assicurazione');
  const complete = AssistantMessage({ text: '- **Assicurazione**: 120,00 €', streaming: true });
  assert.equal(textOf(complete), 'Assicurazione: 120,00 €');
  assert.equal(textOf(nodes(complete, 'strong')[0]), 'Assicurazione');
  assert.equal(nodes(complete, 'li')[0].props.children.at(-1), ': 120,00 €');
});

test('final unmatched markers remain visible rather than losing user data', () => {
  const view = AssistantMessage({ text: 'Testo **senza chiusura' });
  assert.equal(textOf(view), 'Testo **senza chiusura');
  assert.equal(nodes(view, 'strong').length, 0);
  assert.equal(AssistantMessage({ text: ' \n ' }), null);
});

test('format escapes, inline code and Unicode amounts remain readable', () => {
  const view = AssistantMessage({ text: '\\*letterale\\* e `EUR`\n\n- **Καφές ☕**: 3,50 €' });
  assert.equal(textOf(nodes(view, 'p')[0]), '*letterale* e EUR');
  assert.deepEqual(nodes(view, 'code').map(textOf), ['EUR']);
  assert.equal(textOf(nodes(view, 'li')[0]), 'Καφές ☕: 3,50 €');
});

test('complete supplied lists survive normalization and rendering beyond old limits', () => {
  const text = 'Elenco disponibile:\n\n' + Array.from({ length: 80 }, (_, i) =>
    `${i + 1}. **Spesa registrata ${i + 1}**: ${(i + 1).toFixed(2)} EUR`).join('\n') +
    '\n\nSono riportate tutte le 80 voci disponibili.';
  assert(text.length > 1400);
  const normalized = logic.compactAssistantAnswer(text, 'it');
  assert.equal(normalized, text);
  assert.equal(nodes(AssistantMessage({ text: normalized }), 'li').length, 80);
  assert(normalized.endsWith('Sono riportate tutte le 80 voci disponibili.'));
  assert(!normalized.endsWith('…'));
});

test('normalization keeps paragraph breaks while explicit legacy caps remain supported', () => {
  assert.equal(logic.compactAssistantAnswer(' Primo\r\nSecondo \r\n\r\nTerzo ', 'it'), 'Primo\nSecondo\n\nTerzo');
  assert(logic.compactAssistantAnswer('word '.repeat(1000), 'it', 600).length <= 601);
});

test('speech removes formatting markers but preserves amounts, signs and item boundaries', () => {
  const text = '## Riepilogo\n\n1. **Rimborso**: -12,50 €\n2) **Spesa**: 30,00 EUR\n\n• Dettaglio in `EUR`.';
  const speech = assistantSpeechText(text);
  assert.equal(speech, 'Riepilogo\n\nRimborso: -12,50 €\nSpesa: 30,00 EUR\n\nDettaglio in EUR.');
  assert(!/[#*`•]/.test(speech));
  assert.equal(text, '## Riepilogo\n\n1. **Rimborso**: -12,50 €\n2) **Spesa**: 30,00 EUR\n\n• Dettaglio in `EUR`.');
});

test('speech does not read URL markup or expose raw hyperlink destinations', () => {
  assert.equal(assistantSpeechText('Apri [la guida](https://example.test/guida).'), 'Apri la guida.');
});

test('both translation payloads preserve structure and exact financial amounts', () => {
  const answer = '**Spese**\n\n- **Caffè**: 3,50 €\n- **Pane**: 2,00 €';
  for (const build of [logic.buildAssistantTranslationPayload, logic.buildFinanceAdviceTranslationPayload]) {
    const payload = build(answer, 'en');
    assert.equal(payload.language, 'en');
    assert(payload.question.endsWith(answer));
    assert.match(payload.instruction, /Preserve paragraph breaks, list structure, numbering and Markdown emphasis/);
    assert.match(payload.instruction, /Keep numeric amounts and currencies unchanged/);
  }
});

test('generation guidance covers complete requested lists and the restored History route', () => {
  const guide = logic.FAINANCE_PRODUCT_GUIDE;
  const instructions = logic.assistantProductKnowledgeInstruction();
  assert.match(guide.responseStyle.lists, /only its title in \*\*bold\*\*/);
  assert.match(instructions, /Preserve every relevant item supplied for an explicitly requested list/);
  assert.match(instructions, /state the supplied omission count/);
  assert.match(guide.procedures.installmentRegister.join(' '), /tap Filter \(Filtra\)/);
  assert(!instructions.includes('History > Installments'));
  assert.match(instructions, /FULL_DATA_ACCESS_REQUIRED/);
  assert.match(instructions, /Never execute an unconfirmed action|Never claim an operation succeeded before the app executes it/);
});

test('financial enumerations route to structured text in all ten app languages', () => {
  for (const question of [
    'Quali spese rateizzate ho nel 2026?', 'Mostrami le spese', 'Elenco delle spese di marzo',
    'Which expenses do I have in installments in 2026?',
    '¿Qué gastos tengo en cuotas en 2026?',
    'Quelles dépenses sont échelonnées en 2026 ?',
    'Welche Ausgaben zahle ich 2026 in Raten?',
    'Quais despesas tenho em prestações em 2026?',
    'Jakie wydatki mam na raty w 2026?',
    'Welke uitgaven betaal ik in termijnen in 2026?',
    'Ce cheltuieli am în rate în 2026?',
    'Ποιες δαπάνες έχω σε δόσεις το 2026;'
  ]) assert.equal(logic.requiresStructuredAssistantAnswer(question), true, question);
});

test('formatting requests route without depending on financial keywords', () => {
  for (const question of [
    'Riorganizza l’elenco precedente in paragrafi, con i titoli in grassetto',
    'Use paragraphs and bold titles', 'Usa párrafos y negrita', 'Utilise des paragraphes et du gras',
    'Verwende Absätze und fett gedruckte Titel', 'Usa parágrafos e negrito',
    'Użyj akapitów i pogrubionych tytułów', 'Gebruik alinea’s en vetgedrukte titels',
    'Folosește paragrafe și titluri îngroșate', 'Χρησιμοποίησε παραγράφους και έντονους τίτλους'
  ]) assert.equal(logic.requiresStructuredAssistantAnswer(question), true, question);
});

test('short follow-ups retain prior list routing while ignoring local-only history', () => {
  const history = [{ role: 'user', text: 'Elenca le spese rateizzate del 2026' }];
  assert.equal(logic.requiresStructuredAssistantAnswer('E quelle precedenti?', history), true);
  assert.equal(logic.requiresStructuredAssistantAnswer('E quelle precedenti?', [{ ...history[0], localOnly: true }]), false);
  assert.equal(logic.requiresStructuredAssistantAnswer('Continua', [{ role: 'user', text: 'Continua' }]), false);
});

test('ordinary facts and write instructions do not require the list renderer route', () => {
  for (const question of ['', 'Ciao', 'Mi senti?', 'Qual è il tuo nome?', 'Quanto ho speso questo mese?', 'Crea una spesa di 20 euro', 'Confermo']) {
    assert.equal(logic.requiresStructuredAssistantAnswer(question), false, question);
  }
});


test('comparison output removes internal citations and boilerplate but keeps figures and material limits', () => {
  const answer = '## Confronto periodi contabili (valuta euro)\n\nDati caricati. Completezza non verified.\n\nDal 1 al 10 novembre hai speso 100 €, contro 80 € negli stessi giorni di ottobre (requestedPeriod / requested expense drivers).\n\n- **Energia: +20 €**\n- Spesa casa: **+5 €**\n\nPer due movimenti manca la categoria.';
  assert.equal(logic.compactAssistantAnswer(answer,'it'), 'Dal 1 al 10 novembre hai speso 100 €, contro 80 € negli stessi giorni di ottobre.\n\n- **Energia**: +20 €\n- **Spesa casa**: +5 €\n\nPer due movimenti manca la categoria.');
  assert.match(logic.assistantProductKnowledgeInstruction(), /movement-by-movement breakdown only when requested/);
});
