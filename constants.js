/**
 * Константы ino2ubi — конвертер Arduino в блоки FLProg
 */
const VERSION = '1.7.6';

const PRIMITIVE_TYPES = new Set([
  'int', 'long', 'unsigned long', 'bool', 'boolean', 'float', 'double',
  'byte', 'char', 'String', 'uint8_t', 'int16_t', 'uint16_t', 'int32_t', 'uint32_t'
]);

const TYPE_MAPPING = {
  'int': 'IntegerDataType',
  'long': 'LongDataType',
  'unsigned long': 'LongDataType',
  'bool': 'BooleanDataType',
  'boolean': 'BooleanDataType',
  'float': 'FloatDataType',
  'double': 'FloatDataType',
  'byte': 'ByteDataType',
  'char': 'CharDataType',
  'String': 'StringDataType',
  'uint8_t': 'ByteDataType',
  'int16_t': 'IntegerDataType',
  'uint16_t': 'IntegerDataType',
  'int32_t': 'LongDataType',
  'uint32_t': 'LongDataType'
};

function getTypeClassName(varType) {
  return TYPE_MAPPING[varType] || 'IntegerDataType';
}

