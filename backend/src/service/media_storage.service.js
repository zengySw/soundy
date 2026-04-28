import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config/env.js";

function to_hex(input) {
  return Buffer.from(input).toString("hex");
}

function sha256_hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac_sha256(key, value, encoding = undefined) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function encode_path_for_url(path_value) {
  return String(path_value || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function remove_file_silent(file_path) {
  if (!file_path) {
    return;
  }
  try {
    await fs.unlink(file_path);
  } catch {
    // no-op
  }
}

async function move_file(source_path, target_path) {
  await fs.mkdir(path.dirname(target_path), { recursive: true });
  try {
    await fs.rename(source_path, target_path);
  } catch {
    await fs.copyFile(source_path, target_path);
    await remove_file_silent(source_path);
  }
}

export function normalize_media_key(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

function resolve_local_absolute_path(media_key) {
  const normalized_key = normalize_media_key(media_key);
  const tracks_base_dir = path.resolve(config.TRACKS_BASE_DIR);
  const absolute_path = path.resolve(tracks_base_dir, normalized_key);
  const safe_base_prefix = `${tracks_base_dir}${path.sep}`;

  if (absolute_path !== tracks_base_dir && !absolute_path.startsWith(safe_base_prefix)) {
    throw new Error("TRACK_PATH_OUTSIDE_BASE_DIR");
  }

  return absolute_path;
}

function build_r2_public_url(media_key) {
  const base_url = String(config.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  const normalized_key = normalize_media_key(media_key);
  if (!base_url || !normalized_key) {
    return null;
  }
  return `${base_url}/${encode_path_for_url(normalized_key)}`;
}

function ensure_r2_upload_config() {
  const account_id = String(config.R2_ACCOUNT_ID || "").trim();
  const access_key_id = String(config.R2_ACCESS_KEY_ID || "").trim();
  const secret_access_key = String(config.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket_name = String(config.R2_BUCKET_NAME || "").trim();

  if (!account_id || !access_key_id || !secret_access_key || !bucket_name) {
    throw new Error("R2_UPLOAD_CONFIG_MISSING");
  }

  return {
    account_id,
    access_key_id,
    secret_access_key,
    bucket_name,
  };
}

async function upload_to_r2({ media_key, body_buffer, content_type }) {
  const { account_id, access_key_id, secret_access_key, bucket_name } = ensure_r2_upload_config();
  const normalized_key = normalize_media_key(media_key);
  if (!normalized_key) {
    throw new Error("MEDIA_KEY_REQUIRED");
  }

  const host = `${account_id}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const canonical_uri = `/${encodeURIComponent(bucket_name)}/${encode_path_for_url(
    normalized_key,
  )}`;
  const method = "PUT";
  const amz_date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date_stamp = amz_date.slice(0, 8);
  const payload_hash = sha256_hex(body_buffer);

  const canonical_header_entries = [
    ["host", host],
    ["x-amz-content-sha256", payload_hash],
    ["x-amz-date", amz_date],
  ];

  const normalized_content_type = String(content_type || "").trim();
  if (normalized_content_type) {
    canonical_header_entries.push(["content-type", normalized_content_type]);
  }

  canonical_header_entries.sort((left, right) => left[0].localeCompare(right[0]));

  const signed_headers = canonical_header_entries.map(([key]) => key).join(";");
  const canonical_headers = canonical_header_entries
    .map(([key, value]) => `${key}:${String(value).trim()}\n`)
    .join("");

  const canonical_request = [
    method,
    canonical_uri,
    "",
    canonical_headers,
    signed_headers,
    payload_hash,
  ].join("\n");

  const credential_scope = `${date_stamp}/${region}/${service}/aws4_request`;
  const string_to_sign = [
    "AWS4-HMAC-SHA256",
    amz_date,
    credential_scope,
    sha256_hex(canonical_request),
  ].join("\n");

  const date_key = hmac_sha256(`AWS4${secret_access_key}`, date_stamp);
  const region_key = hmac_sha256(date_key, region);
  const service_key = hmac_sha256(region_key, service);
  const signing_key = hmac_sha256(service_key, "aws4_request");
  const signature = to_hex(hmac_sha256(signing_key, string_to_sign));

  const authorization = [
    "AWS4-HMAC-SHA256 Credential=",
    `${access_key_id}/${credential_scope}, `,
    `SignedHeaders=${signed_headers}, `,
    `Signature=${signature}`,
  ].join("");

  const request_headers = {
    Authorization: authorization,
    host,
    "x-amz-content-sha256": payload_hash,
    "x-amz-date": amz_date,
  };
  if (normalized_content_type) {
    request_headers["content-type"] = normalized_content_type;
  }

  const response = await fetch(`https://${host}${canonical_uri}`, {
    method,
    headers: request_headers,
    body: body_buffer,
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(
      `R2_UPLOAD_FAILED:${response.status}:${payload.slice(0, 250)}`,
    );
  }
}

export function get_media_driver() {
  return config.MEDIA_DRIVER === "r2" ? "r2" : "local";
}

export async function upload_temp_file_to_media_storage({
  temp_file_path,
  media_key,
  content_type = "",
}) {
  const normalized_key = normalize_media_key(media_key);
  if (!normalized_key) {
    throw new Error("MEDIA_KEY_REQUIRED");
  }

  if (get_media_driver() === "r2") {
    const body_buffer = await fs.readFile(temp_file_path);
    await upload_to_r2({
      media_key: normalized_key,
      body_buffer,
      content_type,
    });
    await remove_file_silent(temp_file_path);
    return {
      media_key: normalized_key,
      public_url: build_r2_public_url(normalized_key),
    };
  }

  const target_path = resolve_local_absolute_path(normalized_key);
  await move_file(temp_file_path, target_path);
  return {
    media_key: normalized_key,
    absolute_path: target_path,
  };
}

export async function resolve_media_read_payload(media_key) {
  const normalized_key = normalize_media_key(media_key);
  if (!normalized_key) {
    return null;
  }

  if (get_media_driver() === "r2") {
    const public_url = build_r2_public_url(normalized_key);
    if (!public_url) {
      return null;
    }
    return {
      driver: "r2",
      public_url,
      media_key: normalized_key,
    };
  }

  const absolute_path = resolve_local_absolute_path(normalized_key);
  try {
    await fs.access(absolute_path);
  } catch {
    return null;
  }

  return {
    driver: "local",
    absolute_path,
    media_key: normalized_key,
  };
}

export async function resolve_ads_read_payload(local_candidates) {
  if (get_media_driver() === "r2") {
    const configured_key = normalize_media_key(config.R2_ADS_OBJECT_KEY);
    if (!configured_key) {
      return null;
    }
    const public_url = build_r2_public_url(configured_key);
    if (!public_url) {
      return null;
    }
    return {
      driver: "r2",
      media_key: configured_key,
      public_url,
    };
  }

  for (const relative_path of local_candidates) {
    const payload = await resolve_media_read_payload(relative_path);
    if (payload) {
      return payload;
    }
  }

  return null;
}
