export type LoginStartPayload = {
  requiresOtp: boolean;
};

export type AuthStep = "credentials" | "otp" | "done";

export type FlowResolution = {
  step: AuthStep;
  info: string;
};

export const resolveSignupStart = (): FlowResolution => ({
  step: "otp",
  info: "OTP sent to your email."
});

export const resolveLoginStart = (payload: LoginStartPayload): FlowResolution => {
  if (payload.requiresOtp) {
    return {
      step: "otp",
      info: "OTP sent to your email."
    };
  }
  return {
    step: "done",
    info: "Login successful."
  };
};
