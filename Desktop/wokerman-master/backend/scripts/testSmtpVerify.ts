/* eslint-disable no-console */
import { EmailDeliveryError, verifySmtpConnection } from "../src/email/confirmationSender.js";

const assertCondition = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "test";
    const testResult = await verifySmtpConnection({
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUser: "test-smtp-user@example.com",
      smtpPass: "test-smtp-pass",
      smtpSecure: false
    });
    assertCondition(testResult.ok === true, "Expected ok=true in test mode.");
    assertCondition(testResult.verified === true, "Expected verified=true in test mode.");
    assertCondition(testResult.provider === "console", "Expected provider=console in test mode.");

    process.env.NODE_ENV = "production";
    let threw = false;
    try {
      await verifySmtpConnection({
        smtpHost: "",
        smtpPort: 0,
        smtpUser: "",
        smtpPass: "",
        smtpSecure: false
      });
    } catch (error) {
      threw = true;
      assertCondition(error instanceof EmailDeliveryError, "Expected EmailDeliveryError for missing SMTP config.");
      if (error instanceof EmailDeliveryError) {
        assertCondition(error.code === "SMTP_NOT_CONFIGURED", "Expected SMTP_NOT_CONFIGURED error code.");
      }
    }
    assertCondition(threw, "Expected missing SMTP config verification to throw.");

    console.log("SMTP verify tests passed.");
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
