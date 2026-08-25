#!/usr/bin/env node
import { contextSnapshot } from "../../../scripts/context-snapshot.mjs";

try {
  process.stdout.write(`${JSON.stringify(contextSnapshot(), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`rpivc context error: ${error.message}\n`);
  process.exitCode = 1;
}
