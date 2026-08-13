#!/usr/bin/env node
// dsh-voice 检查/迁移工具。
//   dsh-voice check [dir...]     校验 voice 文件形状(默认扫描内置 + 用户 + 项目目录)
//   dsh-voice migrate [dir...]   迁移指定目录下的 voice 文件到当前版本
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseVoiceFile, VOICE_EXTENSION } from '../lib/voice-file.js'
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
        parseVoiceFile(readFileSync(path, 'utf8'), path)
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

function usage() {
  console.log('Usage: dsh-voice <check|migrate> [dir...]')
  return 2
}

const cmd_ = cmd
if (cmd_ === 'check') {
  process.exit(check(args.length > 0 ? args : ['.']))
} else if (cmd_ === 'migrate') {
  // migrate 的「动作」即:重新解析并校验到当前版本;当前版本尚无字段级改写,
  // 故先做 dry-run 校验并报告版本,写入留待首个需要改写的版本迁移。
  const dirs = args.length > 0 ? args : ['.']
  let ok = true
  for (const dir of dirs) {
    for (const path of collectFiles(resolve(dir))) {
      try {
        parseVoiceFile(readFileSync(path, 'utf8'), path)
        console.log(`✓ (already v${CURRENT_VOICE_VERSION}) ${path}`)
      } catch (error) {
        ok = false
        console.log(`✗ ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  process.exit(ok ? 0 : 1)
} else {
  process.exit(usage())
}
