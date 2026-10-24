const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const { parseEnv } = require("node:util")
const { processEnv } = require("@next/env")

const environmentFiles = {
  dev: ".env.dev",
  uat: ".env.uat",
  prod: ".env.production",
}

const [environment, ...args] = process.argv.slice(2)
const filename = Object.hasOwn(environmentFiles, environment) ? environmentFiles[environment] : undefined
if (!filename) {
  console.error("Choose an environment: dev, uat, or prod.")
  process.exit(1)
}

const projectDirectory = resolve(__dirname, "..")
let contents
try {
  contents = readFileSync(resolve(projectDirectory, filename), "utf8")
} catch (error) {
  console.error(`Cannot load ${filename} (${error.code}).`)
  process.exit(1)
}

// Explicitly selected file values take precedence over inherited app settings.
for (const key of Object.keys(parseEnv(contents))) delete process.env[key]
delete process.env.__NEXT_PROCESSED_ENV
process.env.NODE_ENV = "development"
// Next's loader also expands $VARIABLE references and prevents other .env files
// from being loaded into this server process.
processEnv([{ path: filename, contents }], projectDirectory)

const nextCli = require.resolve("next/dist/bin/next")
process.chdir(projectDirectory)
process.argv = [process.execPath, nextCli, "dev", "-p", "3040", ...args]
require(nextCli)
