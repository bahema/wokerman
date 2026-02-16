export const validatePasswordChangeInput = (input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
    return "All password fields are required.";
  }
  if (input.newPassword.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (input.newPassword !== input.confirmPassword) {
    return "New password and confirmation do not match.";
  }
  return "";
};

