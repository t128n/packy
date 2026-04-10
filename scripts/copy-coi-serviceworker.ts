import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("node_modules/coi-serviceworker/coi-serviceworker.js");
const target = resolve("public/coi-serviceworker.js");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
