#!/usr/bin/env node
/**
 * ino2ubi CLI: Arduino-скетч (.ino) -> пользовательский блок FLProg (.ubi).
 * Использует те же constants.js / parser.js / generator.js, что и веб-страница.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function findSources() {
  for (const dir of [__dirname, path.join(__dirname, '..')]) {
    if (['constants.js', 'parser.js', 'generator.js'].every(f => fs.existsSync(path.join(dir, f)))) return dir;
  }
  throw new Error('Не найдены constants.js, parser.js, generator.js');
}

function loadConverter() {
  const dir = findSources();
  // Минимальная имитация DOM: generator.js использует только escapeHtml через textContent/innerHTML
  const document = {
    createElement() {
      let t = '';
      return {
        set textContent(v) { t = String(v); },
        get innerHTML() { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      };
    }
  };
  const sandbox = { window: {}, document, crypto: require('crypto'), console };
  vm.createContext(sandbox);
  for (const f of ['constants.js', 'parser.js', 'generator.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f });
  }
  return sandbox.window;
}

function convert(code, opts) {
  const api = loadConverter();
  const result = api.parseArduinoCode(code);
  let setupCode = api.extractFunctionBody(code, 'setup');
  let loopCode = api.extractFunctionBody(code, 'loop');
  const name = opts.name || 'Custom Block';
  const desc = opts.desc || result.leading_comment || 'Автоматически сгенерированный блок';
  const xml = api.createUbiXmlSixx(
    name, desc, result.variables, result.functions, result.global_includes,
    result.defines, result.extra_declarations, result.static_declarations,
    setupCode, loopCode, !!opts.en
  );
  return { xml, result, name };
}

function toUtf16Le(str) {
  const buf = Buffer.from(str, 'utf16le');
  return Buffer.concat([Buffer.from([0xFF, 0xFE]), buf]);
}

function summary(result) {
  const byRole = r => Object.entries(result.variables).filter(([, v]) => v.role === r).map(([k]) => k);
  const params = byRole('parameter').concat(result.defines.filter(d => d.role === 'parameter').map(d => d.name));
  return [
    'Входы:     ' + (byRole('input').join(', ') || '—'),
    'Выходы:    ' + (byRole('output').join(', ') || '—'),
    'Параметры: ' + (params.join(', ') || '—'),
    'Переменные: ' + (byRole('variable').join(', ') || '—'),
    'Функции:   ' + (Object.keys(result.functions).join(', ') || '—'),
    'В declare как текст: ' + result.extra_declarations.length + ', static: ' + result.static_declarations.length
  ].join('\n');
}

function main(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') args.out = argv[++i];
    else if (a === '--name') args.name = argv[++i];
    else if (a === '--desc') args.desc = argv[++i];
    else if (a === '--en') args.en = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else args._.push(a);
  }
  if (args.help || !args._.length) {
    console.log('Использование: ino2ubi <скетч.ino> [-o блок.ubi] [--name "Имя блока"] [--desc "Описание"] [--en]');
    return args.help ? 0 : 1;
  }
  const input = args._[0];
  const code = fs.readFileSync(input, 'utf8').replace(/^﻿/, '');
  const base = path.basename(input, path.extname(input));
  const { xml, result, name } = convert(code, { name: args.name || base, desc: args.desc, en: args.en });
  const out = args.out || path.join(path.dirname(input), name.replace(/\s+/g, '_').replace(/[^\w\-]/g, '_') + '.ubi');
  fs.writeFileSync(out, toUtf16Le(xml));
  console.log('Файл: ' + out);
  console.log(summary(result));
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { console.error('Ошибка: ' + e.message); process.exitCode = 1; }
}
module.exports = { convert, toUtf16Le, summary };
