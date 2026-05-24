import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildHermesAgentToolsetsConfigValues,
  mergeHermesAgentToolsetsConfig,
} from '../scripts/dev-api.js'

test('Hermes Agent 工具集配置读取会提供上游默认值', () => {
  const values = buildHermesAgentToolsetsConfigValues({})

  assert.deepEqual(values, {
    disabledToolsets: '',
  })
})

test('Hermes Agent 工具集配置读取会回显全局禁用列表', () => {
  const values = buildHermesAgentToolsetsConfigValues({
    agent: {
      disabled_toolsets: ['memory', 'web', 'browser'],
    },
  })

  assert.equal(values.disabledToolsets, 'memory\nweb\nbrowser')
})

test('Hermes Agent 工具集配置保存会去重并保留未知字段', () => {
  const next = mergeHermesAgentToolsetsConfig({
    model: { provider: 'anthropic' },
    agent: {
      disabled_toolsets: ['memory'],
      max_turns: 80,
      custom_flag: 'keep-agent',
    },
    streaming: { enabled: true },
  }, {
    disabledToolsets: ' terminal \n browser \n\n memory\nbrowser ',
  })

  assert.deepEqual(next.model, { provider: 'anthropic' })
  assert.deepEqual(next.streaming, { enabled: true })
  assert.deepEqual(next.agent.disabled_toolsets, ['terminal', 'browser', 'memory'])
  assert.equal(next.agent.max_turns, 80)
  assert.equal(next.agent.custom_flag, 'keep-agent')
})

test('Hermes Agent 工具集配置保存空输入会写入空数组', () => {
  const next = mergeHermesAgentToolsetsConfig({
    agent: {
      disabled_toolsets: ['memory'],
      custom_flag: 'keep-agent',
    },
  }, {
    disabledToolsets: '  \n ',
  })

  assert.deepEqual(next.agent.disabled_toolsets, [])
  assert.equal(next.agent.custom_flag, 'keep-agent')
})

test('Hermes Agent 工具集配置保存会拒绝非法工具集名称', () => {
  assert.throws(
    () => mergeHermesAgentToolsetsConfig({}, { disabledToolsets: 'bad tool' }),
    /agent\.disabled_toolsets/,
  )
  assert.throws(
    () => mergeHermesAgentToolsetsConfig({}, { disabledToolsets: '../secret' }),
    /agent\.disabled_toolsets/,
  )
})
