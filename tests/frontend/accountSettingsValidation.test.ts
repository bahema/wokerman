import test from "node:test";
import assert from "node:assert/strict";
import { validatePasswordChangeInput } from "../../src/components/admin/accountSettingsValidation";

test("password validation rejects missing fields", () => {
  const error = validatePasswordChangeInput({ currentPassword: "", newPassword: "", confirmPassword: "" });
  assert.equal(error, "All password fields are required.");
});

test("password validation rejects short password", () => {
  const error = validatePasswordChangeInput({
    currentPassword: "oldpass123",
    newPassword: "short",
    confirmPassword: "short"
  });
  assert.equal(error, "New password must be at least 8 characters.");
});

test("password validation rejects mismatch", () => {
  const error = validatePasswordChangeInput({
    currentPassword: "oldpass123",
    newPassword: "newpass123",
    confirmPassword: "newpass999"
  });
  assert.equal(error, "New password and confirmation do not match.");
});

test("password validation accepts valid payload", () => {
  const error = validatePasswordChangeInput({
    currentPassword: "oldpass123",
    newPassword: "newpass123",
    confirmPassword: "newpass123"
  });
  assert.equal(error, "");
});

