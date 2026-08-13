#!/usr/bin/env node
// dsh-voice 检查/迁移工具。
//   dsh-voice check [dir...]     校验 voice 文件形状(默认扫描当前目录)
//   dsh-voice migrate [dir...]   把旧版本 voice 文件原地迁移到当前版本(写回)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { migrateVoiceFileText, parseVoiceFileData, serializeVoice, VOICE_EXTENSION } from '../lib/voice-file.js'
import { CURRENT_VOICE_VERSION } from '../lib/voice-schema.js'

const [cmd, ...args] = process.argv.slice(2)

function collectFiles(dir) {
  const out = []
  try {
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(VOICE_EXTENSION)) continue
      const path = join(dir, entry)
      if (statSync(path).isFile()) out.push(path)
    }
  } catch {
    // 目录不存在或无权限即跳过。
  }
  return out
}

function check(dirs) {
  let failed = 0
  let total = 0
  for (const dir of dirs) {
    for (const path of collectFiles(resolve(dir))) {
      total += 1
      try {
        parseVoiceFileData(readFileSync(path, 'utf8'), path)
        console.log(`✓ ${path}`)
      } catch (error) {
        failed += 1
        console.log(`✗ ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  console.log(`\n${total} file(s) checked, ${failed} failed`)
  return failed === 0 ? 0 : 1
}

function migrate(dirs) {
  let migrated = 0
  let total = 0
  let failed = 0
  for (const dir of dirs) {
    for (const path of collectFiles(resolve(dir))) {
      total += 1
      try {
        const text = readFileSync(path, 'utf8')
        const { data, changed } = migrateVoiceFileText(text, path)
        if (changed) {
          writeFileSync(path, serializeVoice(data))
          console.log(`↑ migrated to v${CURRENT_VOICE_VERSION}: ${path}`)
        } else {
          console.log(`✓ (already v${CURRENT_VOICE_VERSION}) ${path}`)
        }
        migrated += changed ? 1 : 0
      } catch (error) {
        failed += 1
        console.log(`✗ ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  console.log(`\n${total} file(s) scanned, ${migrated} migrated, ${failed} failed`)
  return failed === 0 ? 0 : 1
}

function usage() {
  console.log('Usage: dsh-voice <check|migrate> [dir...]')
  return 2
}

const dirs = args.length > 0 ? args : ['.']
if (cmd === 'check') {
  process.exit(check(dirs))
} else if (cmd === 'migrate') {
  process.exit(migrate(dirs))
} else {
  process.exit(usage())
}
