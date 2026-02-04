/**
 * Генератор SIXX XML для FLProg (.ubi) — порт с Python
 */
function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeCodeForSixx(text) {
  let s = escapeHtml(text);
  s = s.replace(/\(/g, '&#40;').replace(/\)/g, '&#41;');
  s = s.replace(/,/g, '&#44;').replace(/%/g, '&#37;');
  return s;
}

function findTopLevelEquals(str) {
  let paren = 0, bracket = 0, brace = 0;
  let inString = false, stringChar = '', escape = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(paren - 1, 0);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(bracket - 1, 0);
    else if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(brace - 1, 0);
    if (ch === '=' && paren === 0 && bracket === 0 && brace === 0) return i;
  }
  return -1;
}

function createSixxDataType(varType, typeId, instanceCollId, nextId) {
  const typeClass = getTypeClassName(varType);
  const instanceId = nextId();
  let xml = '\t\t\t\t<sixx.object sixx.id="' + typeId + '" sixx.name="type" sixx.type="' + typeClass + ' class" sixx.env="Arduino" >\n';
  xml += '\t\t\t\t\t<sixx.object sixx.id="' + instanceCollId + '" sixx.name="instanceCollection" sixx.type="OrderedCollection" sixx.env="Core" >\n';
  xml += '\t\t\t\t\t\t<sixx.object sixx.id="' + instanceId + '" sixx.type="' + typeClass + '" sixx.env="Arduino" >\n';
  xml += '\t\t\t\t\t\t</sixx.object>\n\t\t\t\t\t</sixx.object>\n\t\t\t\t</sixx.object>\n';
  return xml;
}

function createUbiXmlSixx(
  blockName,
  blockDescription,
  variables,
  functions,
  globalIncludes,
  defines,
  extraDeclarations,
  staticDeclarations,
  setupCode,
  loopCode,
  enableInput = false
) {
  setupCode = setupCode.split('\n').map(l => l.trimEnd()).join('\n');
  loopCode = loopCode.split('\n').map(l => l.trimEnd()).join('\n');
  if (enableInput) loopCode = 'if(En)\n{\n' + loopCode + '\n}';
  const loopCodeEncoded = escapeCodeForSixx(loopCode);
  const setupCodeEncoded = escapeCodeForSixx(setupCode);

  let currentId = 0;
  function nextId() {
    currentId++;
    return currentId;
  }

  const rootId = 0;
  const codeBlockId = nextId();
  const mainUuidId = nextId();
  const mainUuid = uuidv4();
  const blocksCollId = nextId();
  const labelId = nextId();
  const inputsCollId = nextId();
  const instanceCollId = 15;
  const commentStrId = 18;

  const codeOrderPos = v => v.position !== undefined ? v.position : 999999999;

  let inputsXml = '';
  let inputsList = Object.entries(variables).filter(([, info]) => info.role === 'input');
  inputsList.sort((a, b) => codeOrderPos(a[1]) - codeOrderPos(b[1]));

  if (enableInput) {
    const enAdaptorId = nextId(), enObjId = nextId(), enIdSourceId = nextId(), enTypeId = nextId();
    const enNameId = nextId(), enUuidObjId = nextId(), enInputUuid = uuidv4();
    inputsXml += '\t\t\t<sixx.object sixx.id="' + enAdaptorId + '" sixx.type="InputsOutputsAdaptorForUserBlock" sixx.env="Arduino" >\n';
    inputsXml += '\t\t\t\t<sixx.object sixx.id="' + enObjId + '" sixx.name="object" sixx.type="UniversalBlockInputOutput" sixx.env="Arduino" >\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.id="' + enIdSourceId + '" sixx.name="id" sixx.type="SmallInteger" sixx.env="Core" >119328430</sixx.object>\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="block" sixx.idref="' + codeBlockId + '" />\n';
    inputsXml += createSixxDataType('boolean', enTypeId, instanceCollId, nextId);
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="isInput" sixx.type="True" sixx.env="Core" />\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.id="' + enNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >En</sixx.object>\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="isNot" sixx.type="False" sixx.env="Core" />\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="nameCash" sixx.idref="' + enNameId + '" />\n';
    inputsXml += '\t\t\t\t</sixx.object>\n\t\t\t\t<sixx.object sixx.name="comment" sixx.idref="' + commentStrId + '" />\n';
    inputsXml += '\t\t\t\t<sixx.object sixx.id="' + enUuidObjId + '" sixx.name="id" sixx.type="String" sixx.env="Core" >' + enInputUuid + '</sixx.object>\n';
    inputsXml += '\t\t\t</sixx.object>\n';
  }

  let idBase = enableInput ? 119329430 : 119328430;
  inputsList.forEach(([varName, varInfo], idx) => {
    const adaptorId = nextId(), objId = nextId(), idSourceId = nextId(), typeId = nextId();
    const nameId = nextId(), uuidObjId = nextId(), inputUuid = uuidv4();
    inputsXml += '\t\t\t<sixx.object sixx.id="' + adaptorId + '" sixx.type="InputsOutputsAdaptorForUserBlock" sixx.env="Arduino" >\n';
    inputsXml += '\t\t\t\t<sixx.object sixx.id="' + objId + '" sixx.name="object" sixx.type="UniversalBlockInputOutput" sixx.env="Arduino" >\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.id="' + idSourceId + '" sixx.name="id" sixx.type="SmallInteger" sixx.env="Core" >' + (idBase + idx * 1000) + '</sixx.object>\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="block" sixx.idref="' + codeBlockId + '" />\n';
    inputsXml += createSixxDataType(varInfo.type, typeId, instanceCollId, nextId);
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="isInput" sixx.type="True" sixx.env="Core" />\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.id="' + nameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + (varInfo.alias || varName) + '</sixx.object>\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="isNot" sixx.type="False" sixx.env="Core" />\n';
    inputsXml += '\t\t\t\t\t<sixx.object sixx.name="nameCash" sixx.idref="' + nameId + '" />\n';
    inputsXml += '\t\t\t\t</sixx.object>\n\t\t\t\t<sixx.object sixx.name="comment" sixx.idref="' + commentStrId + '" />\n';
    inputsXml += '\t\t\t\t<sixx.object sixx.id="' + uuidObjId + '" sixx.name="id" sixx.type="String" sixx.env="Core" >' + inputUuid + '</sixx.object>\n';
    inputsXml += '\t\t\t</sixx.object>\n';
  });

  const outputsCollId = nextId();
  let outputsXml = '';
  let outputsList = Object.entries(variables).filter(([, info]) => info.role === 'output');
  outputsList.sort((a, b) => codeOrderPos(a[1]) - codeOrderPos(b[1]));
  idBase = 153438280;
  outputsList.forEach(([varName, varInfo], idx) => {
    const adaptorId = nextId(), objId = nextId(), idSourceId = nextId(), typeId = nextId();
    const nameId = nextId(), uuidObjId = nextId(), outputUuid = uuidv4();
    outputsXml += '\t\t\t<sixx.object sixx.id="' + adaptorId + '" sixx.type="InputsOutputsAdaptorForUserBlock" sixx.env="Arduino" >\n';
    outputsXml += '\t\t\t\t<sixx.object sixx.id="' + objId + '" sixx.name="object" sixx.type="UniversalBlockInputOutput" sixx.env="Arduino" >\n';
    outputsXml += '\t\t\t\t\t<sixx.object sixx.id="' + idSourceId + '" sixx.name="id" sixx.type="SmallInteger" sixx.env="Core" >' + (idBase + idx * 1000) + '</sixx.object>\n';
    outputsXml += '\t\t\t\t\t<sixx.object sixx.name="block" sixx.idref="' + codeBlockId + '" />\n';
    outputsXml += createSixxDataType(varInfo.type, typeId, instanceCollId, nextId);
    outputsXml += '\t\t\t\t\t<sixx.object sixx.name="isInput" sixx.type="False" sixx.env="Core" />\n';
    outputsXml += '\t\t\t\t\t<sixx.object sixx.id="' + nameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + (varInfo.alias || varName) + '</sixx.object>\n';
    outputsXml += '\t\t\t\t\t<sixx.object sixx.name="isNot" sixx.type="False" sixx.env="Core" />\n';
    outputsXml += '\t\t\t\t\t<sixx.object sixx.name="nameCash" sixx.idref="' + nameId + '" />\n';
    outputsXml += '\t\t\t\t</sixx.object>\n\t\t\t\t<sixx.object sixx.name="comment" sixx.idref="' + commentStrId + '" />\n';
    outputsXml += '\t\t\t\t<sixx.object sixx.id="' + uuidObjId + '" sixx.name="id" sixx.type="String" sixx.env="Core" >' + outputUuid + '</sixx.object>\n';
    outputsXml += '\t\t\t</sixx.object>\n';
  });

  const varsCollId = nextId(), nameStrId = nextId(), infoId = nextId(), infoStrId = nextId();
  const runsId = nextId(), runsArrId = nextId(), runsValId = nextId(), valuesArrId = nextId();
  const paramsCollId = nextId();
  let paramsXml = '';
  const paramsList = [];
  Object.entries(variables).forEach(([name, info]) => {
    if (info.role === 'parameter') paramsList.push({ pos: codeOrderPos(info), name, info });
  });
  (defines || []).forEach(d => {
    if (d.role === 'parameter') {
      paramsList.push({
        pos: d.position !== undefined ? d.position : 999999999,
        name: d.name,
        info: { type: d.type || 'String', alias: d.name, default: d.value != null ? String(d.value) : '' }
      });
    }
  });
  paramsList.sort((a, b) => a.pos - b.pos);
  paramsList.forEach(({ name, info: varInfo }) => {
    const adaptorId = nextId(), paramId = nextId(), paramNameId = nextId(), paramTypeId = nextId();
    const defaultValId = nextId(), commentId = nextId(), uuidParamId = nextId(), uuidAdaptId = nextId();
    const paramUuid = uuidv4(), adaptUuid = uuidv4();
    let defaultVal = varInfo.type === 'String' ? (varInfo.default || '') : (varInfo.default || '0');
    if ((varInfo.type === 'bool' || varInfo.type === 'boolean') && ['true', '1'].includes(String(defaultVal).trim().toLowerCase())) defaultVal = '1';
    else if ((varInfo.type === 'bool' || varInfo.type === 'boolean')) defaultVal = '0';
    paramsXml += '\t\t\t\t<sixx.object sixx.id="' + adaptorId + '" sixx.type="InputsOutputsAdaptorForUserBlock" sixx.env="Arduino" >\n';
    paramsXml += '\t\t\t\t\t<sixx.object sixx.id="' + paramId + '" sixx.name="object" sixx.type="UserBlockParametr" sixx.env="Arduino" >\n';
    paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + paramNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + (varInfo.alias || name) + '</sixx.object>\n';
    paramsXml += createSixxDataType(varInfo.type, paramTypeId, instanceCollId, nextId);
    paramsXml += '\t\t\t\t\t\t<sixx.object sixx.name="hasDefaultValue" sixx.type="True" sixx.env="Core" />\n';
    if (varInfo.type === 'String') {
      paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + defaultValId + '" sixx.name="stringDefaultValue" sixx.type="String" sixx.env="Core" >' + escapeHtml(defaultVal) + '</sixx.object>\n';
    } else {
      try {
        if (varInfo.type === 'float' || varInfo.type === 'double') {
          paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + defaultValId + '" sixx.name="numberDefaultValue" sixx.type="Float" sixx.env="Core" >' + defaultVal + '</sixx.object>\n';
        } else {
          paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + defaultValId + '" sixx.name="numberDefaultValue" sixx.type="SmallInteger" sixx.env="Core" >' + defaultVal + '</sixx.object>\n';
        }
      } catch (_) {
        paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + defaultValId + '" sixx.name="numberDefaultValue" sixx.type="SmallInteger" sixx.env="Core" >0</sixx.object>\n';
      }
    }
    paramsXml += '\t\t\t\t\t\t<sixx.object sixx.name="hasUpRange" sixx.type="False" sixx.env="Core" />\n';
    paramsXml += '\t\t\t\t\t\t<sixx.object sixx.name="hasDownRange" sixx.type="False" sixx.env="Core" />\n';
    paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + commentId + '" sixx.name="comment" sixx.type="String" sixx.env="Core" ></sixx.object>\n';
    paramsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + uuidParamId + '" sixx.name="id" sixx.type="String" sixx.env="Core" >' + paramUuid + '</sixx.object>\n';
    paramsXml += '\t\t\t\t\t</sixx.object>\n\t\t\t\t\t<sixx.object sixx.id="' + uuidAdaptId + '" sixx.name="id" sixx.type="String" sixx.env="Core" >' + adaptUuid + '</sixx.object>\n';
    paramsXml += '\t\t\t\t</sixx.object>\n';
  });

  const loopPartId = nextId(), loopCodeId = nextId();
  const setupPartId = nextId(), setupCodeId = nextId();
  const declarePartId = nextId(), declareCollId = nextId();
  let declareXml = '';
  const varsList = Object.entries(variables).filter(([, info]) => info.role === 'variable');

  (globalIncludes || []).forEach(inc => {
    const line = (inc || '').trim();
    if (!line.startsWith('#include')) return;
    const rest = line.slice(8).trim();
    const declId = nextId(), defineId = nextId(), nameId = nextId();
    declareXml += '\t\t\t\t\t<sixx.object sixx.id="' + declId + '" sixx.type="CodeUserBlockDeclareDefineBlock" sixx.env="Arduino" >\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + defineId + '" sixx.name="define" sixx.type="String" sixx.env="Core" >&#35;include</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + nameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + escapeHtml(rest) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t</sixx.object>\n';
  });

  (defines || []).forEach(d => {
    if (d.role === 'parameter') return;
    const declId = nextId(), defineId = nextId(), nameId = nextId(), lastPartId = nextId();
    const dName = String(d.name || '').trim();
    const dValue = String(d.value || '').trim();
    declareXml += '\t\t\t\t\t<sixx.object sixx.id="' + declId + '" sixx.type="CodeUserBlockDeclareDefineBlock" sixx.env="Arduino" >\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + defineId + '" sixx.name="define" sixx.type="String" sixx.env="Core" >&#35;define</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + nameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + escapeHtml(dName) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + lastPartId + '" sixx.name="lastPart" sixx.type="String" sixx.env="Core" >' + escapeHtml(dValue) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t</sixx.object>\n';
  });

  (staticDeclarations || []).forEach(lineRaw => {
    const line = (lineRaw || '').trim();
    if (!line.endsWith(';')) return;
    const stmt = line.slice(0, -1).trim();
    if (!/^\s*static\s+/.test(stmt)) return;
    const m = stmt.match(/^\s*static\s+(.+?)\s+([a-zA-Z_][A-Za-z0-9_]*)\s*([\s\S]*)$/);
    if (!m) return;
    const firstPart = 'static ' + m[1].trim();
    const namePart = m[2];
    const rest = m[3].trim();
    const lastPart = rest.startsWith('=') ? '= ' + escapeCodeForSixx(rest.slice(1).trim()) + ';' : ';';
    const declId = nextId(), declNameId = nextId(), declLastId = nextId(), declFirstId = nextId();
    declareXml += '\t\t\t\t\t<sixx.object sixx.id="' + declId + '" sixx.type="CodeUserBlockDeclareStandartBlock" sixx.env="Arduino" >\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + escapeHtml(namePart) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declLastId + '" sixx.name="lastPart" sixx.type="String" sixx.env="Core" >' + lastPart + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declFirstId + '" sixx.name="firstPart" sixx.type="String" sixx.env="Core" >' + escapeHtml(firstPart) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t</sixx.object>\n';
  });

  (extraDeclarations || []).forEach(lineRaw => {
    const line = (lineRaw || '').trim();
    if (!line.endsWith(';')) return;
    const stmt = line.slice(0, -1).trim();
    const declId = nextId(), declNameId = nextId(), declLastId = nextId(), declFirstId = nextId();
<<<<<<< HEAD
    // Тип может содержать пробелы и * (const char*, unsigned long и т.д.) — берём последний идентификатор перед = как имя переменной
    const declMatch = stmt.match(/^(.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(=.*)?$/s);
    let firstPart, namePart, lastPartRaw;
    if (declMatch) {
      firstPart = declMatch[1].trim();
      namePart = declMatch[2];
      lastPartRaw = (declMatch[3] || '').trim();
    } else {
      firstPart = stmt || '';
      namePart = '';
      lastPartRaw = '';
=======
    let firstPart, namePart, lastPart;
    const eqPos = findTopLevelEquals(stmt);
    if (eqPos >= 0) {
      const leftSide = stmt.slice(0, eqPos).trim();
      const valueSide = stmt.slice(eqPos + 1).trim();
      const nameMatch = leftSide.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      namePart = nameMatch ? nameMatch[1] : '';
      firstPart = nameMatch ? leftSide.slice(0, nameMatch.index).trim() : leftSide;
      lastPart = '= ' + escapeCodeForSixx(valueSide) + ';';
    } else {
      const nameMatch = stmt.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      namePart = nameMatch ? nameMatch[1] : '';
      firstPart = nameMatch ? stmt.slice(0, nameMatch.index).trim() : stmt;
      lastPart = ';';
>>>>>>> 32e8510644fb42e08658759e882fbb19c5c4121c
    }
    declareXml += '\t\t\t\t\t<sixx.object sixx.id="' + declId + '" sixx.type="CodeUserBlockDeclareStandartBlock" sixx.env="Arduino" >\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + escapeHtml(namePart) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declLastId + '" sixx.name="lastPart" sixx.type="String" sixx.env="Core" >' + lastPart + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declFirstId + '" sixx.name="firstPart" sixx.type="String" sixx.env="Core" >' + escapeHtml(firstPart) + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t</sixx.object>\n';
  });

  varsList.forEach(([varName, varInfo]) => {
    const declId = nextId(), declNameId = nextId(), declLastId = nextId(), declFirstId = nextId();
    const defaultVal = varInfo.default;
    const lastPart = defaultVal ? '= ' + escapeCodeForSixx(String(defaultVal).trim()) + ';' : ';';
    declareXml += '\t\t\t\t\t<sixx.object sixx.id="' + declId + '" sixx.type="CodeUserBlockDeclareStandartBlock" sixx.env="Arduino" >\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + (varInfo.alias || varName || '').trim() + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declLastId + '" sixx.name="lastPart" sixx.type="String" sixx.env="Core" >' + lastPart + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + declFirstId + '" sixx.name="firstPart" sixx.type="String" sixx.env="Core" >' + (varInfo.type || '').trim() + '</sixx.object>\n';
    declareXml += '\t\t\t\t\t</sixx.object>\n';
  });

  const funcPartId = nextId(), funcCollId = nextId();
  let functionsXml = '';
  Object.entries(functions || {}).forEach(([funcName, funcInfo]) => {
    const funcId = nextId(), funcBodyId = nextId(), funcProtoId = nextId(), funcRetTypeId = nextId();
    const funcNameId = nextId(), funcParamsCollId = nextId();
    const bodyEncoded = escapeCodeForSixx((funcInfo.body || '').split('\n').map(l => l.trimEnd()).join('\n'));
    functionsXml += '\t\t\t\t\t<sixx.object sixx.id="' + funcId + '" sixx.type="CodeUserBlockFunction" sixx.env="Arduino" >\n';
    functionsXml += '\t\t\t\t\t<sixx.object sixx.id="' + funcBodyId + '" sixx.name="functionBody" sixx.type="String" sixx.env="Core" >' + bodyEncoded + '</sixx.object>\n';
    functionsXml += '\t\t\t\t\t<sixx.object sixx.id="' + funcProtoId + '" sixx.name="parsesFunctionName" sixx.type="CodeUserBlockFunctionName" sixx.env="Arduino" >\n';
    functionsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + funcRetTypeId + '" sixx.name="declare" sixx.type="String" sixx.env="Core" >' + (funcInfo.return_type || 'void') + '</sixx.object>\n';
    functionsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + funcNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + funcName + '</sixx.object>\n';
    functionsXml += '\t\t\t\t\t\t<sixx.object sixx.id="' + funcParamsCollId + '" sixx.name="parametrs" sixx.type="OrderedCollection" sixx.env="Core" >\n';
    (funcInfo.parsed_params || []).forEach(param => {
      const fparamId = nextId(), fparamTypeId = nextId(), fparamNameId = nextId();
      functionsXml += '\t\t\t\t\t\t\t<sixx.object sixx.id="' + fparamId + '" sixx.type="CodeUserBlockFunctionParametr" sixx.env="Arduino" >\n';
      functionsXml += '\t\t\t\t\t\t\t\t<sixx.object sixx.id="' + fparamTypeId + '" sixx.name="declare" sixx.type="String" sixx.env="Core" >' + (param.type || '') + '</sixx.object>\n';
      functionsXml += '\t\t\t\t\t\t\t\t<sixx.object sixx.id="' + fparamNameId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + (param.name || '') + '</sixx.object>\n';
      functionsXml += '\t\t\t\t\t\t\t</sixx.object>\n';
    });
    functionsXml += '\t\t\t\t\t\t</sixx.object>\n\t\t\t\t\t</sixx.object>\n\t\t\t\t\t</sixx.object>\n';
  });

  const libsId = nextId();

  let xml = '<sixx.object sixx.id="' + rootId + '" sixx.type="BlocksLibraryElement" sixx.env="Arduino" >\n';
  xml += '\t<sixx.object sixx.id="' + codeBlockId + '" sixx.name="typeClass" sixx.type="CodeUserBlock" sixx.env="Arduino" >\n';
  xml += '\t\t<sixx.object sixx.id="' + mainUuidId + '" sixx.name="id" sixx.type="String" sixx.env="Core" >' + mainUuid + '</sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + blocksCollId + '" sixx.name="blocks" sixx.type="OrderedCollection" sixx.env="Core" ></sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + labelId + '" sixx.name="label" sixx.type="String" sixx.env="Core" >' + blockName + '</sixx.object>\n';
  xml += inputsXml
    ? '\t\t<sixx.object sixx.id="' + inputsCollId + '" sixx.name="inputs" sixx.type="OrderedCollection" sixx.env="Core" >\n' + inputsXml + '\t\t</sixx.object>\n'
    : '\t\t<sixx.object sixx.id="' + inputsCollId + '" sixx.name="inputs" sixx.type="OrderedCollection" sixx.env="Core" ></sixx.object>\n';
  xml += outputsXml
    ? '\t\t<sixx.object sixx.id="' + outputsCollId + '" sixx.name="outputs" sixx.type="OrderedCollection" sixx.env="Core" >\n' + outputsXml + '\t\t</sixx.object>\n'
    : '\t\t<sixx.object sixx.id="' + outputsCollId + '" sixx.name="outputs" sixx.type="OrderedCollection" sixx.env="Core" ></sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + varsCollId + '" sixx.name="variables" sixx.type="OrderedCollection" sixx.env="Core" ></sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + nameStrId + '" sixx.name="name" sixx.type="String" sixx.env="Core" >' + blockName + '</sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + infoId + '" sixx.name="info" sixx.type="Text" sixx.env="Core" >\n';
  xml += '\t\t\t<sixx.object sixx.id="' + infoStrId + '" sixx.name="string" sixx.type="String" sixx.env="Core" >' + escapeHtml(blockDescription) + '</sixx.object>\n';
  xml += '\t\t\t<sixx.object sixx.id="' + runsId + '" sixx.name="runs" sixx.type="RunArray" sixx.env="Core" >\n';
  xml += '\t\t\t\t<sixx.object sixx.id="' + runsArrId + '" sixx.name="runs" sixx.type="Array" sixx.env="Core" >\n';
  xml += '\t\t\t\t\t<sixx.object sixx.id="' + runsValId + '" sixx.type="SmallInteger" sixx.env="Core" >50</sixx.object>\n';
  xml += '\t\t\t\t</sixx.object>\n\t\t\t\t<sixx.object sixx.id="' + valuesArrId + '" sixx.name="values" sixx.type="Array" sixx.env="Core" >\n';
  xml += '\t\t\t\t\t<sixx.object sixx.type="UndefinedObject" sixx.env="Core" />\n';
  xml += '\t\t\t\t</sixx.object>\n\t\t\t</sixx.object>\n\t\t</sixx.object>\n';
  xml += paramsXml
    ? '\t\t<sixx.object sixx.id="' + paramsCollId + '" sixx.name="parametrs" sixx.type="OrderedCollection" sixx.env="Core" >\n' + paramsXml + '\t\t</sixx.object>\n'
    : '\t\t<sixx.object sixx.id="' + paramsCollId + '" sixx.name="parametrs" sixx.type="OrderedCollection" sixx.env="Core" ></sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + loopPartId + '" sixx.name="loopCodePart" sixx.type="CodeUserBlockLoopCodePart" sixx.env="Arduino" >\n';
  xml += '\t\t\t<sixx.object sixx.id="' + loopCodeId + '" sixx.name="code" sixx.type="String" sixx.env="Core" >' + loopCodeEncoded + '</sixx.object>\n';
  xml += '\t\t</sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + setupPartId + '" sixx.name="setupCodePart" sixx.type="CodeUserBlockSetupCodePart" sixx.env="Arduino" >\n';
  xml += '\t\t\t<sixx.object sixx.id="' + setupCodeId + '" sixx.name="code" sixx.type="String" sixx.env="Core" >' + setupCodeEncoded + '</sixx.object>\n';
  xml += '\t\t</sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + declarePartId + '" sixx.name="declareCodePart" sixx.type="CodeUserBlockDeclareCodePart" sixx.env="Arduino" >\n';
  xml += '\t\t\t<sixx.object sixx.id="' + declareCollId + '" sixx.name="code" sixx.type="OrderedCollection" sixx.env="Core" >\n' + declareXml + '\t\t\t</sixx.object>\n';
  xml += '\t\t</sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + funcPartId + '" sixx.name="functionCodePart" sixx.type="CodeUserBlockFunctuinCodePart" sixx.env="Arduino" >\n';
  xml += '\t\t\t<sixx.object sixx.id="' + funcCollId + '" sixx.name="code" sixx.type="OrderedCollection" sixx.env="Core" >\n' + functionsXml + '\t\t\t</sixx.object>\n';
  xml += '\t\t</sixx.object>\n';
  xml += '\t\t<sixx.object sixx.id="' + libsId + '" sixx.name="userLibraries" sixx.type="OrderedCollection" sixx.env="Core" ></sixx.object>\n';
  xml += '\t\t<sixx.object sixx.name="notCanManyUse" sixx.type="False" sixx.env="Core" />\n';
  xml += '\t</sixx.object>\n</sixx.object>\n';
  return xml;
}

if (typeof window !== 'undefined') {
  window.createUbiXmlSixx = createUbiXmlSixx;
}
