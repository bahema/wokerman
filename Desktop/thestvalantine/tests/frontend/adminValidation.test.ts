import test from "node:test";
import assert from "node:assert/strict";
import { defaultSiteContent } from "../../src/data/siteData";
import { validateContentForSave } from "../../src/pages/adminValidation";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test("admin validation accepts default content", () => {
  const content = clone(defaultSiteContent);
  const error = validateContentForSave(content);
  assert.equal(error, "");
});

test("admin validation rejects invalid social URL", () => {
  const content = clone(defaultSiteContent);
  content.socials.facebookUrl = "not-a-url";
  const error = validateContentForSave(content);
  assert.match(error, /Facebook URL must be a valid http\(s\) URL/);
});

test("admin validation rejects missing product title", () => {
  const content = clone(defaultSiteContent);
  content.products.forex[0].title = " ";
  const error = validateContentForSave(content);
  assert.match(error, /Forex product #1: Title is required/);
});

