import LicensingService from 'common/licensing-service'
import { getSchema } from 'common/telemetry'
import { Bot } from 'common/typings'
import Database from 'core/database'
import { calculateHash } from 'core/misc/utils'
import { TelemetryRepository } from 'core/repositories/telemetry_payload'
import { TYPES } from 'core/types'
import { inject, injectable } from 'inversify'
import ms from 'ms'

import { GhostService } from '..'
import { BotService } from '../bot-service'
import { JobService } from '../job-service'

import { TelemetryStats } from './telemetry-stats'

interface BotLanguage {
  botId: string
  language: string
}

@injectable()
export class BotLanguageStats extends TelemetryStats {
  protected url: string
  protected lock: string
  protected interval: number

  constructor(
    @inject(TYPES.GhostService) ghostService: GhostService,
    @inject(TYPES.Database) database: Database,
    @inject(TYPES.LicensingService) licenseService: LicensingService,
    @inject(TYPES.JobService) jobService: JobService,
    @inject(TYPES.TelemetryRepository) telemetryRepo: TelemetryRepository,
    @inject(TYPES.BotService) private botService: BotService
  ) {
    super(ghostService, database, licenseService, jobService, telemetryRepo)
    this.url = process.TELEMETRY_URL
    this.lock = 'botpress:telemetry-bot-language'
    this.interval = ms('1d')
  }

  protected async getStats() {
    console.log({
      ...getSchema(await this.getServerStats(), 'server'),
      event_type: 'builtin_actions',
      event_data: { schema: '1.0.0', languages: await this.getBotsLanguage() }
    })
    return {
      ...getSchema(await this.getServerStats(), 'server'),
      event_type: 'builtin_actions',
      event_data: { schema: '1.0.0', languages: await this.getBotsLanguage() }
    }
  }

  private async getBotsLanguage() {
    const bots = await this.botService.getBots()
    const languages: BotLanguage[] = []
    for (const [key, value] of bots) {
      const botId = calculateHash(key)
      languages.push({ botId, language: value.defaultLanguage })
    }

    return languages
  }
}
