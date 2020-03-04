/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  docs: {
    'Getting Started': [
      'introduction',
      'installation',
      'quickstart',
      'about-pro',
      'licensing',
      'updating',
      'troubleshoot'
    ],
    'Building Bots': [
      'overview',
      { type: 'category', label: 'Concepts', items: ['dialog', 'memory', 'code'] },
      {
        type: 'category',
        label: 'Channels',
        items: ['channels', 'web', 'teams', 'slack', 'converse', 'messenger', 'telegram']
      },
      { type: 'category', label: 'Flows', items: ['timeouts'] },
      {
        type: 'category',
        label: 'NLU',
        items: ['nlu', 'intent-matching', 'contextual-faq', 'skill-slot', '3rd-party-NLU']
      },
      { type: 'category', label: 'CMS', items: ['content', 'i18n', 'carousel-postback'] },
      { type: 'category', label: 'Modules', items: ['module', 'hitl', 'custom-module', 'uipath'] },
      { type: 'category', label: 'Debugging', items: ['debug', 'emulator'] },
      { type: 'category', label: 'Skills', items: ['skill-call-api'] },
      {
        type: 'category',
        label: 'Patterns',
        items: ['jump-to', 'listen-for-file-changes', 'chat-3rd-party-OAuth', 'external-api', 'interbot']
      },
      'existing-backend',
      'faq',
      'migrate',
      'proactive',
      'shortlinks'
    ],
    'Managing Botpress': [
      'hosting',
      'database',
      'configuration',
      'cluster-digital-ocean',
      'cluster',
      'performances',
      'rbac',
      'analytics',
      'authentication',
      'release-notes',
      'pipelines',
      'development-pipeline',
      'versions',
      'authentication',
      'sync-changes',
      'monitoring'
    ]
  }
}
