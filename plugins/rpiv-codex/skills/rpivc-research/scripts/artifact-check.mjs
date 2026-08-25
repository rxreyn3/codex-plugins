#!/usr/bin/env node
import { artifactCheckMain } from "../../../scripts/artifact-check.mjs";

artifactCheckMain().then((result) => {
  process.stdout.write(typeof result === "string" ? result : `${JSON.stringify(result, null, 2)}\n`);
}).catch((error) => {
  process.stderr.write(`rpivc artifact check error: ${error.message}\n`);
  process.exitCode = 1;
});
