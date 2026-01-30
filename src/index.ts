import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { main as runInit } from "./canaries-init.js";

export function main() {
  runInit();
}
