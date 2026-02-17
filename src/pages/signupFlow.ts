export type LoginStartPayload = {
  requiresOtp: boolean;
  devOtp?: string;
};

export type AuthStep = "credentials" | "otp" | "done";

export type FlowResolution = {
  step: AuthStep;
  info: string;
};

const withDevOtp = (message: string, devOtp?: string) => (devOtp ? `${message} Dev OTP: ${devOtp}` : message);

export const resolveSignupStart = (devOtp?: string): FlowResolution => ({
  step: "otp",
  info: withDevOtp("OTP sent to your email.", devOtp)
});

export const resolveLoginStart = (payload: LoginStartPayload): FlowResolution => {
  if (payload.requiresOtp) {
    return {
      step: "otp",
      info: withDevOtp("OTP sent to your email.", payload.devOtp)
    };
  }
  return {
    step: "done",
    info: "Login successful."
  };
};
