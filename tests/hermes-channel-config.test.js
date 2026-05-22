import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildHermesChannelEnvUpdates,
  buildHermesChannelConfigValues,
  mergeHermesChannelConfig,
} from '../scripts/dev-api.js'

test('Hermes 渠道读取会从 platforms 平台配置生成稳定表单值', () => {
  const values = buildHermesChannelConfigValues({
    platforms: {
      telegram: {
        enabled: true,
        token: '123:token',
        extra: {
          dm_policy: 'pair',
          group_policy: 'allowlist',
          allow_from: ['1001', '1002'],
          require_mention: true,
        },
      },
    },
  })

  assert.equal(values.telegram.enabled, true)
  assert.equal(values.telegram.botToken, '123:token')
  assert.equal(values.telegram.dmPolicy, 'pair')
  assert.equal(values.telegram.groupPolicy, 'allowlist')
  assert.equal(values.telegram.allowFrom, '1001, 1002')
  assert.equal(values.telegram.requireMention, true)
})

test('Hermes 渠道保存会写入 Hermes 最新 platforms 配置并保留无关配置', () => {
  const next = mergeHermesChannelConfig({
    model: { provider: 'anthropic', default: 'claude-sonnet-4-6' },
    platforms: {
      telegram: {
        enabled: false,
        token: 'old',
        extra: {
          unknown_option: 'keep-me',
        },
      },
    },
  }, 'telegram', {
    enabled: true,
    botToken: '123:token',
    dmPolicy: 'pair',
    groupPolicy: 'allowlist',
    allowFrom: '1001, 1002',
    requireMention: true,
  })

  assert.deepEqual(next.model, { provider: 'anthropic', default: 'claude-sonnet-4-6' })
  assert.equal(next.platforms.telegram.enabled, true)
  assert.equal(next.platforms.telegram.token, '123:token')
  assert.equal(next.platforms.telegram.extra.dm_policy, 'pair')
  assert.equal(next.platforms.telegram.extra.group_policy, 'allowlist')
  assert.deepEqual(next.platforms.telegram.extra.allow_from, ['1001', '1002'])
  assert.equal(next.platforms.telegram.extra.require_mention, true)
  assert.equal(next.platforms.telegram.extra.unknown_option, 'keep-me')
})

test('Hermes 飞书保存会补齐可运行默认项并使用 Hermes snake_case 字段', () => {
  const next = mergeHermesChannelConfig({}, 'feishu', {
    enabled: true,
    appId: 'cli_xxx',
    appSecret: 'secret',
    domain: '',
    connectionMode: '',
    webhookPath: '',
    reactionNotifications: '',
    typingIndicator: true,
    resolveSenderNames: true,
  })

  assert.equal(next.platforms.feishu.enabled, true)
  assert.equal(next.platforms.feishu.extra.app_id, 'cli_xxx')
  assert.equal(next.platforms.feishu.extra.app_secret, 'secret')
  assert.equal(next.platforms.feishu.extra.domain, 'feishu')
  assert.equal(next.platforms.feishu.extra.connection_mode, 'websocket')
  assert.equal(next.platforms.feishu.extra.webhook_path, '/feishu/webhook')
  assert.equal(next.platforms.feishu.extra.reaction_notifications, 'off')
  assert.equal(next.platforms.feishu.extra.typing_indicator, true)
  assert.equal(next.platforms.feishu.extra.resolve_sender_names, true)
})

test('Hermes 渠道保存会生成运行时仍会读取的环境变量', () => {
  const telegramEnv = buildHermesChannelEnvUpdates('telegram', {
    botToken: '123:token',
    allowFrom: '1001, 1002',
    groupAllowFrom: 'group-a\ngroup-b',
    requireMention: true,
  })

  assert.equal(telegramEnv.TELEGRAM_BOT_TOKEN, '123:token')
  assert.equal(telegramEnv.TELEGRAM_ALLOWED_USERS, '1001,1002')
  assert.equal(telegramEnv.TELEGRAM_GROUP_ALLOWED_USERS, 'group-a,group-b')
  assert.equal(telegramEnv.TELEGRAM_REQUIRE_MENTION, 'true')

  const feishuEnv = buildHermesChannelEnvUpdates('feishu', {
    appId: 'cli_xxx',
    appSecret: 'secret',
    domain: '',
    connectionMode: '',
    webhookPath: '',
    groupPolicy: 'allowlist',
    reactionNotifications: 'off',
  })

  assert.equal(feishuEnv.FEISHU_APP_ID, 'cli_xxx')
  assert.equal(feishuEnv.FEISHU_APP_SECRET, 'secret')
  assert.equal(feishuEnv.FEISHU_DOMAIN, 'feishu')
  assert.equal(feishuEnv.FEISHU_CONNECTION_MODE, 'websocket')
  assert.equal(feishuEnv.FEISHU_WEBHOOK_PATH, '/feishu/webhook')
  assert.equal(feishuEnv.FEISHU_GROUP_POLICY, 'allowlist')
  assert.equal(feishuEnv.FEISHU_REACTIONS, 'false')
})
