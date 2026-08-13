// 从 src/voice-schema.ts 的 schemastery schema 生成 voice.schema.yaml(JSON Schema)。
// 运行:node scripts/gen-schema.mjs(需先 pnpm build)。
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { stringify } from 'yaml'
import { voiceJsonSchema } from '../lib/voice-schema.js'

const out = new URL('../voice.schema.yaml', import.meta.url)
writeFileSync(out, `# Generated from src/voice-schema.ts by scripts/gen-schema.mjs — do not edit by hand.\n${stringify(voiceJsonSchema())}`)
console.log(`wrote ${fileURLToPath(out)}`)
