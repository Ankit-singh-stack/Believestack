export const success = (res, payload, status = 200) => res.status(status).json({ success: true, ...payload });
export const error = (res, message, status = 400, details = null) => {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
};
