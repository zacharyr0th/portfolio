#!/usr/bin/env node

const fs = require('fs')
const { execSync } = require('child_process')

// Load security config
const securityConfig = require('../.securityrc.js')

function checkForSecurityIssues() {
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).split('\n').filter(Boolean)

  let hasIssues = false

  for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue

    const content = fs.readFileSync(file, 'utf8')

    // Check each security rule
    for (const [ruleName, rule] of Object.entries(securityConfig)) {
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern, 'g')
        const matches = content.match(regex)

        if (matches) {
          console.error(`\x1b[31m❌ Security issue found in ${file}: ${rule.description}\x1b[0m`)
          console.error(`   Rule: ${ruleName}`)
          hasIssues = true
        }
      }
    }
  }

  if (hasIssues) {
    console.error('\n\x1b[31m❌ Security check failed. Please fix the issues above.\x1b[0m')
    process.exit(1)
  } else {
    console.log('\x1b[32m✅ Security check passed\x1b[0m')
  }
}

checkForSecurityIssues()