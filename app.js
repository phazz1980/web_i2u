/**
 * ino2ubi Web — фронтенд для GitHub Pages (только браузер, без сервера)
 */
(function () {
  if (typeof VERSION !== 'undefined') {
    const el = document.getElementById('versionSpan');
    if (el) el.textContent = VERSION;
  }

  const lastUpdatedEl = document.getElementById('lastUpdatedSpan');
  if (lastUpdatedEl) {
    const source = (typeof LAST_UPDATED !== 'undefined' && LAST_UPDATED) ? LAST_UPDATED : document.lastModified;
    if (source) {
      const d = new Date(source);
      if (!isNaN(d.getTime())) {
        // Отображаем в часовом поясе пользователя с указанием зоны
        lastUpdatedEl.textContent = d.toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        });
      } else {
        lastUpdatedEl.textContent = source;
      }
    }
  }

  const codeInput = document.getElementById('codeInput');
  const fileIno = document.getElementById('fileIno');
  const btnLoad = document.getElementById('btnLoad');
  const btnClear = document.getElementById('btnClear');
  const btnParse = document.getElementById('btnParse');
  const btnGenerate = document.getElementById('btnGenerate');
  const blockName = document.getElementById('blockName');
  const blockDesc = document.getElementById('blockDesc');
  const enableInput = document.getElementById('enableInput');
  const varBody = document.getElementById('varBody');
  const funcBody = document.getElementById('funcBody');
  const statusEl = document.getElementById('status');
  const modalEdit = document.getElementById('modalEdit');
  const modalEditTitle = document.getElementById('modalEditTitle');
  const modalEditBody = document.getElementById('modalEditBody');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');

  let state = {
    variables: {},
    functions: {},
    global_includes: [],
    defines: [],
    extra_declarations: [],
    static_declarations: []
  };

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
    statusEl.classList.toggle('success', !isError && !!msg);
  }

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
      tab.classList.add('active');
      var id = 'tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
      var content = document.getElementById(id);
      if (content) content.classList.add('active');
    });
  });

  btnLoad.addEventListener('click', function () { fileIno.click(); });
  fileIno.addEventListener('change', function () {
    var file = fileIno.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      codeInput.value = reader.result;
      var base = file.name.replace(/\.(ino|txt)$/i, '');
      if (base) blockName.value = base;
      setStatus('Загружен: ' + file.name);
    };
    reader.readAsText(file, 'UTF-8');
    fileIno.value = '';
  });

  btnClear.addEventListener('click', function () {
    codeInput.value = '';
    setStatus('Очищено');
  });

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderVariables() {
    varBody.innerHTML = '';
    var vars = state.variables || {};
    var defines = state.defines || [];
    Object.keys(vars).forEach(function (name) {
      var info = vars[name];
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(name) + '</td><td>' + escapeHtml(info.type || '') + '</td><td>' + escapeHtml(info.role || 'variable') + '</td><td>' + escapeHtml(info.alias || name) + '</td><td>' + escapeHtml(info.default != null ? String(info.default) : '') + '</td>';
      tr.dataset.type = 'variable';
      tr.dataset.key = name;
      // При повторном открытии берём актуальное состояние переменной из state, а не захваченное в замыкании
      tr.addEventListener('dblclick', function () { openEditVariable(name, state.variables[name], tr); });
      varBody.appendChild(tr);
    });
    defines.forEach(function (d, idx) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(d.name || '') + '</td><td>' + escapeHtml(d.type || 'String') + '</td><td>' + escapeHtml(d.role || 'global') + '</td><td>' + escapeHtml(d.name || '') + '</td><td>' + escapeHtml(d.value != null ? String(d.value) : '') + '</td>';
      tr.dataset.type = 'define';
      tr.dataset.key = String(idx);
      // Также для #define всегда читаем актуальные данные из state
      tr.addEventListener('dblclick', function () { openEditDefine(idx, state.defines[idx], tr); });
      varBody.appendChild(tr);
    });
  }

  function renderFunctions() {
    funcBody.innerHTML = '';
    var funcs = state.functions || {};
    Object.keys(funcs).forEach(function (name) {
      var info = funcs[name];
      var bodyPreview = (info.body || '').length > 50 ? escapeHtml((info.body || '').slice(0, 50) + '…') : escapeHtml(info.body || '');
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(name) + '</td><td>' + escapeHtml(info.return_type || 'void') + '</td><td>' + escapeHtml(info.params || '(нет)') + '</td><td title="' + escapeAttr(info.body || '') + '">' + bodyPreview + '</td>';
      tr.dataset.funcName = name;
      // И для функций используем всегда текущее состояние в state
      tr.addEventListener('dblclick', function () { openEditFunction(name, state.functions[name], tr); });
      funcBody.appendChild(tr);
    });
  }

  btnParse.addEventListener('click', function () {
    var code = codeInput.value.trim();
    if (!code) {
      setStatus('Вставьте или загрузите код', true);
      return;
    }
    setStatus('Парсинг…');
    try {
      var result = window.parseArduinoCode(code);
      state = {
        variables: result.variables || {},
        functions: result.functions || {},
        global_includes: result.global_includes || [],
        defines: result.defines || [],
        extra_declarations: result.extra_declarations || [],
        static_declarations: result.static_declarations || []
      };
      if (result.leading_comment) blockDesc.value = result.leading_comment;
      renderVariables();
      renderFunctions();
      var v = Object.keys(state.variables).length;
      var f = Object.keys(state.functions).length;
      var inc = (state.global_includes || []).length;
      var def = (state.defines || []).length;
      setStatus('Найдено: переменных ' + v + ', функций ' + f + ', #include ' + inc + ', #define ' + def);
    } catch (e) {
      setStatus('Ошибка: ' + e.message, true);
    }
  });

  function openEditVariable(name, info, tr) {
    modalEditTitle.textContent = 'Переменная: ' + name;
    var roleOpt = (info.role || '') === 'variable' ? 'selected' : '';
    var inputOpt = (info.role || '') === 'input' ? 'selected' : '';
    var outputOpt = (info.role || '') === 'output' ? 'selected' : '';
    var parOpt = (info.role || '') === 'parameter' ? 'selected' : '';
    modalEditBody.innerHTML = '<div class="form-row"><label>Роль</label><select id="editRole"><option value="variable" ' + roleOpt + '>variable</option><option value="input" ' + inputOpt + '>input</option><option value="output" ' + outputOpt + '>output</option><option value="parameter" ' + parOpt + '>parameter</option></select></div><div class="form-row"><label>Псевдоним</label><input type="text" id="editAlias" value="' + escapeAttr(info.alias || name) + '"></div><div class="form-row"><label>По умолчанию</label><input type="text" id="editDefault" value="' + escapeAttr(info.default != null ? String(info.default) : '') + '"></div>';
    modalEdit.hidden = false;
    modalSave.onclick = function () {
      var role = document.getElementById('editRole').value;
      var alias = document.getElementById('editAlias').value;
      var def = document.getElementById('editDefault').value.trim();
      // Псевдоним может содержать любые символы, в том числе пробелы и русские буквы
      if (!alias.trim()) { setStatus('Псевдоним не может быть пустым', true); return; }
      state.variables[name] = Object.assign({}, state.variables[name], { role: role, alias: alias, default: def || null });
      tr.cells[2].textContent = role;
      tr.cells[3].textContent = alias;
      tr.cells[4].textContent = def;
      modalEdit.hidden = true;
      setStatus('Сохранено');
    };
    modalCancel.onclick = function () { modalEdit.hidden = true; };
  }

  function openEditDefine(idx, d, tr) {
    modalEditTitle.textContent = '#define: ' + (d.name || '');
    var types = ['int', 'long', 'unsigned long', 'float', 'byte', 'char', 'String', 'bool', 'boolean'];
    var opts = types.map(function (t) { return '<option value="' + t + '"' + ((d.type || 'String') === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
    modalEditBody.innerHTML = '<div class="form-row"><label>Имя</label><input type="text" id="editDefineName" value="' + escapeAttr(d.name || '') + '"></div><div class="form-row"><label>Значение</label><input type="text" id="editDefineValue" value="' + escapeAttr(d.value != null ? String(d.value) : '') + '"></div><div class="form-row"><label>Тип</label><select id="editDefineType">' + opts + '</select></div><div class="form-row"><label>Роль</label><select id="editDefineRole"><option value="global"' + ((d.role || '') === 'global' ? ' selected' : '') + '>global</option><option value="parameter"' + ((d.role || '') === 'parameter' ? ' selected' : '') + '>parameter</option></select></div>';
    modalEdit.hidden = false;
    modalSave.onclick = function () {
      var name = document.getElementById('editDefineName').value.trim();
      var value = document.getElementById('editDefineValue').value.trim();
      var type = document.getElementById('editDefineType').value;
      var role = document.getElementById('editDefineRole').value;
      if (!name) { setStatus('Имя не может быть пустым', true); return; }
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) { setStatus('Имя: буквы, цифры, подчёркивание', true); return; }
      state.defines[idx] = { name: name, value: value, type: type, role: role, position: d.position };
      tr.cells[0].textContent = name;
      tr.cells[1].textContent = type;
      tr.cells[2].textContent = role;
      tr.cells[3].textContent = name;
      tr.cells[4].textContent = value;
      modalEdit.hidden = true;
      setStatus('Сохранено');
    };
    modalCancel.onclick = function () { modalEdit.hidden = true; };
  }

  function openEditFunction(name, info, tr) {
    modalEditTitle.textContent = 'Функция: ' + name;
    modalEditBody.innerHTML = '<div class="form-row"><label>Тело функции</label><textarea id="editFuncBody">' + escapeAttr(info.body || '') + '</textarea></div>';
    modalEdit.hidden = false;
    modalSave.onclick = function () {
      var body = document.getElementById('editFuncBody').value;
      state.functions[name] = Object.assign({}, state.functions[name], { body: body });
      var preview = body.length > 50 ? body.slice(0, 50) + '…' : body;
      tr.cells[3].textContent = preview;
      tr.cells[3].title = body;
      modalEdit.hidden = true;
      setStatus('Сохранено');
    };
    modalCancel.onclick = function () { modalEdit.hidden = true; };
  }

  function stringToUtf16LeBlob(str) {
    var len = str.length;
    var buf = new ArrayBuffer(2 + len * 2);
    var view = new DataView(buf);
    view.setUint16(0, 0xFEFF, true);
    for (var i = 0; i < len; i++) {
      view.setUint16(2 + i * 2, str.charCodeAt(i), true);
    }
    return new Blob([buf], { type: 'application/octet-stream' });
  }

  btnGenerate.addEventListener('click', function () {
    var code = codeInput.value;
    if (!code.trim()) {
      setStatus('Вставьте код Arduino', true);
      return;
    }
    setStatus('Генерация…');
    try {
      var setupCode = window.extractFunctionBody(code, 'setup');
      var loopCode = window.extractFunctionBody(code, 'loop');
      var variables = state.variables || {};
      Object.keys(variables).forEach(function (varName) {
        var alias = variables[varName].alias || varName;
        if (alias !== varName) {
          var re = new RegExp('\\b' + varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
          loopCode = loopCode.replace(re, alias);
          setupCode = setupCode.replace(re, alias);
        }
      });
      var name = blockName.value.trim() || 'Custom Block';
      var desc = (blockDesc.value || '').trim() || 'Автоматически сгенерированный блок';
      var xml = window.createUbiXmlSixx(
        name,
        desc,
        state.variables,
        state.functions,
        state.global_includes,
        state.defines,
        state.extra_declarations,
        state.static_declarations,
        setupCode,
        loopCode,
        enableInput.checked
      );
      var blob = stringToUtf16LeBlob(xml);
      var filename = (name || 'block').replace(/\s+/g, '_').replace(/[^\w\-]/g, '_') + '.ubi';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus('Файл .ubi скачан');
    } catch (e) {
      setStatus('Ошибка: ' + e.message, true);
    }
  });

  modalEdit.querySelector('.modal-backdrop').addEventListener('click', function () {
    modalEdit.hidden = true;
  });

  var modalHelp = document.getElementById('modalHelp');
  var btnHelp = document.getElementById('btnHelp');
  var modalHelpClose = document.getElementById('modalHelpClose');
  if (btnHelp && modalHelp) {
    btnHelp.addEventListener('click', function () { modalHelp.hidden = false; });
    if (modalHelpClose) modalHelpClose.addEventListener('click', function () { modalHelp.hidden = true; });
    var helpBackdrop = modalHelp.querySelector('.modal-backdrop');
    if (helpBackdrop) helpBackdrop.addEventListener('click', function () { modalHelp.hidden = true; });
  }

  // Регистрация Service Worker для PWA (офлайн, установка)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
    });
  }
})();
