import test from "node:test";
import assert from "node:assert/strict";
import { resolveLoginStart, resolveSignupStart } from "../../src/pages/signupFlow";

test("signup flow always moves to otp step", () => {
  const result = resolveSignupStart();
  assert.equal(result.step, "otp");
  assert.equal(result.info, "OTP sent to your email.");
});

test("login flow resolves otp branch when required", () => {
  const result = resolveLoginStart({ requiresOtp: true });
  assert.equal(result.step, "otp");
  assert.equal(result.info, "OTP sent to your email.");
});

test("login flow resolves direct success when otp not required", () => {
  const result = resolveLoginStart({ requiresOtp: false });
  assert.equal(result.step, "done");
  assert.equal(result.info, "Login successful.");
});
