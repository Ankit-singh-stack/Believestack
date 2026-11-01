import { ObjectId } from 'mongodb';

export const httpError = (message, status = 400, details = undefined) => {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
};

export const readText = (value, field, { required = false, max = 5000 } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw httpError(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string') throw httpError(`${field} must be a string.`);
  const text = value.trim();
  if (required && !text) throw httpError(`${field} is required.`);
  if (text.length > max) throw httpError(`${field} must be no more than ${max} characters.`);
  return text;
};

export const readList = (value, field, { maxItems = 50, maxLength = 180 } = {}) => {
  if (value === undefined || value === null) return [];
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
  if (!items) throw httpError(`${field} must be a list.`);
  if (items.length > maxItems) throw httpError(`${field} has too many items.`);
  const nonEmptyItems = items.map((item) => {
    if (typeof item !== 'string') throw httpError(`${field} entries must be strings.`);
    return item.trim();
  }).filter(Boolean);
  return [...new Set(nonEmptyItems.map((item) => readText(item, field, { required: true, max: maxLength })))];
};

export const readBoolean = (value, field, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') throw httpError(`${field} must be true or false.`);
  return value;
};

export const readId = (value, field = 'id') => {
  if (typeof value !== 'string' || !ObjectId.isValid(value) || new ObjectId(value).toHexString() !== value.toLowerCase()) {
    throw httpError(`${field} must be a valid identifier.`);
  }
  return new ObjectId(value);
};

export const readPagination = (query) => {
  const rawPage = Number(query.page || 1);
  const rawLimit = Number(query.limit || 10);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
  return { page, limit, offset: (page - 1) * limit };
};

export const slugify = (value) => value
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 180);

export const readEmail = (value) => {
  const email = readText(value, 'Email', { required: true, max: 255 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError('A valid email address is required.');
  return email;
};
