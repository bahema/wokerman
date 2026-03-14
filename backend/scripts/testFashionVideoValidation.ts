/* eslint-disable no-console */
import { defaultFashionVideoContent } from "../src/db/defaultFashionVideoContent.js";
import { validateFashionVideoContent } from "../src/fashion/validateVideoContent.js";

const assertCondition = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const run = () => {
  const validDefault = validateFashionVideoContent(defaultFashionVideoContent);
  assertCondition(validDefault.ok, "Expected default fashion video content to validate.");

  const invalidDuplicateId = structuredClone(defaultFashionVideoContent);
  invalidDuplicateId.videos[1].id = invalidDuplicateId.videos[0].id;
  const duplicateResult = validateFashionVideoContent(invalidDuplicateId);
  assertCondition(!duplicateResult.ok, "Expected duplicate video id to fail validation.");

  const invalidStyleTags = structuredClone(defaultFashionVideoContent);
  invalidStyleTags.videos[0].styleTags = [];
  const styleTagsResult = validateFashionVideoContent(invalidStyleTags);
  assertCondition(!styleTagsResult.ok, "Expected empty style tags to fail validation.");

  const invalidComment = structuredClone(defaultFashionVideoContent);
  invalidComment.videos[0].comments[0].name = "";
  const commentResult = validateFashionVideoContent(invalidComment);
  assertCondition(!commentResult.ok, "Expected invalid comment payload to fail validation.");

  console.log("Fashion video validation tests passed.");
};

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
