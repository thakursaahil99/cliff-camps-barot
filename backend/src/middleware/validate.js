import { HttpError } from '../utils/http.js';

/** Parses req[source] with a zod schema; the parsed value replaces it. Errors -> 400 with field messages. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    return next(new HttpError(400, Object.values(fields)[0] || 'Invalid input', fields));
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};
