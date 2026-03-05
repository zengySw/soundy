import crypto from "crypto";

let currentOtp = null;

export function initAdminOtp() {
  currentOtp = crypto.randomBytes(6).toString("hex");
  console.log(`Admin OTP (one-time for this backend session): ${currentOtp}`);
}

export function getAdminOtp() {
  if (!currentOtp) {
    initAdminOtp();
  }
  return currentOtp;
}
