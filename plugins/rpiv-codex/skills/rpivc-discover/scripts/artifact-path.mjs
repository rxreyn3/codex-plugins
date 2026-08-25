#!/usr/bin/env node
import { artifactPath } from "../../../scripts/artifact-path.mjs";

try {
  const [, , stage, ...topicParts] = process.argv;
  if (!stage || topicParts.length === 0) throw new Error("usage: artifact-path.mjs <discover|research> <topic>");
  process.stdout.write(`${JSON.stringify(artifactPath(stage, topicParts.join(" ")), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`rpivc artifact path error: ${error.message}\n`);
  process.exitCode = 1;
}
