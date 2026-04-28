export function send_api_error(
  res,
  {
    status = 500,
    code = "SERVER_ERROR",
    message = "Server error",
    details = null,
  } = {},
) {
  const payload = {
    ok: false,
    message,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return res.status(status).json(payload);
}

export function send_api_not_found(res, message = "Not found") {
  return send_api_error(res, {
    status: 404,
    code: "NOT_FOUND",
    message,
  });
}
