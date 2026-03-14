/* eslint-disable no-console */
import { defaultFashionContent } from "../src/db/defaultFashionContent.js";
import { validateFashionContent } from "../src/fashion/validateContent.js";

const assertCondition = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const run = () => {
  const validDefault = validateFashionContent(defaultFashionContent);
  assertCondition(validDefault.ok, "Expected default fashion content to validate.");

  const invalidReferenceContent = structuredClone(defaultFashionContent);
  invalidReferenceContent.collectionSpotlightProductId = "missing-product";
  const invalidReference = validateFashionContent(invalidReferenceContent);
  assertCondition(!invalidReference.ok, "Expected missing spotlight product to fail validation.");

  const invalidBundleMetaContent = structuredClone(defaultFashionContent);
  invalidBundleMetaContent.bundleMeta = {
    ...invalidBundleMetaContent.bundleMeta,
    "ghost-bundle": {
      title: "Ghost Bundle",
      note: "Should not validate."
    }
  };
  const invalidBundleMeta = validateFashionContent(invalidBundleMetaContent);
  assertCondition(!invalidBundleMeta.ok, "Expected unknown bundle meta key to fail validation.");

  const invalidHomepageAssignmentContent = structuredClone(defaultFashionContent);
  invalidHomepageAssignmentContent.homepageAssignments["featured-drops"] = ["ghost-product"];
  const invalidHomepageAssignment = validateFashionContent(invalidHomepageAssignmentContent);
  assertCondition(!invalidHomepageAssignment.ok, "Expected invalid homepage assignment to fail validation.");

  console.log("Fashion validation tests passed.");
};

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
