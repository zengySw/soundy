import test from "node:test";
import assert from "node:assert/strict";
import { send_api_error } from "./api-response.util.js";

function create_mock_response() {
  const response = {
    status_code: null,
    payload: null,
    status(next_status) {
      this.status_code = next_status;
      return this;
    },
    json(next_payload) {
      this.payload = next_payload;
      return this;
    },
  };
  return response;
}

test("send_api_error writes uniform payload", () => {
  const response = create_mock_response();

  send_api_error(response, {
    status: 409,
    code: "EMAIL_EXISTS",
    message: "Email already exists",
  });

  assert.equal(response.status_code, 409);
  assert.deepEqual(response.payload, {
    ok: false,
    message: "Email already exists",
    error: {
      code: "EMAIL_EXISTS",
      message: "Email already exists",
    },
  });
});
