import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {loadTypeScript} from './loadTypeScript.mjs';
const reference=JSON.parse(fs.readFileSync('tests/fixtures/general-settings-before-regression.json','utf8'));
function extract(file,predicate){const source=fs.readFileSync(file,'utf8'),root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let result;function visit(node){if(predicate(node,root))result=node;else ts.forEachChild(node,visit);}visit(root);assert(result);return result.getText(root).replace(/\r/g,'');}
const general=extract('src/settings/SettingsPanel.tsx',(n,r)=>ts.isIfStatement(n)&&n.expression.getText(r)==='settingsPage === "general"');
const expected=reference.general.replace(/\r/g,'').replace('setBalancePeriodMode(pendingBalancePeriodMode);\n                setFinancialMonthStartDay(pendingFinancialMonthStartDay);','saveGeneralPeriod();');
assert.equal(general,expected,'Entire General screen must match the supplied backup; only its period persistence adapter changes');
for(const [file,name,key] of [['src/settings/SettingsPanel.tsx','SettingInfo','info'],['src/widget.tsx','FainanceInfoPopover','popover']]){
  assert.equal(extract(file,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name),reference[key].replace(/\r/g,''),'The original info button and popover must be preserved');
}
console.log('General settings: complete backup layout, all info buttons, sizes, spacing, text and original popup behavior restored');

const {generalPeriodInfoRows,generalPeriodTranslation}=loadTypeScript('src/i18n/generalPeriodTranslations.ts');
assert.equal(Object.keys(generalPeriodInfoRows).length,10);
for(const [lang,rows] of Object.entries(generalPeriodInfoRows)){assert.equal(rows.length,2);assert(rows.every(text=>text.trim()));if(lang!=='it'){assert(generalPeriodTranslation('Tipo di periodo',lang));assert.equal(generalPeriodTranslation(generalPeriodInfoRows.it[0],lang),rows[0]);}}
