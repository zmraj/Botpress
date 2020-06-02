import { Logger } from 'botpress/sdk'
import LicensingService, { LicenseInfo, LicenseStatus } from 'common/licensing-service'
import { RequestWithUser } from 'common/typings'
import { ConfigProvider } from 'core/config/config-loader'
import { StatsService } from 'core/services/stats-service'
import { Router } from 'express'
import _ from 'lodash'

import { CustomRouter } from '../customRouter'
import { BadRequestError } from '../errors'
import { assertSuperAdmin, success as sendSuccess } from '../util'

type LicensingStatus = {
  isPro: boolean
  isBuiltWithPro: boolean
  fingerprints: {
    cluster_url: string
  }
  license?: LicenseInfo
} & LicenseStatus

const defaultResponse: LicensingStatus = {
  breachReasons: [],
  status: 'licensed',
  fingerprints: { cluster_url: '' },
  isBuiltWithPro: process.IS_PRO_AVAILABLE,
  isPro: process.IS_PRO_ENABLED
}

export class LicenseRouter extends CustomRouter {
  constructor(
    logger: Logger,
    private licenseService: LicensingService,
    private configProvider: ConfigProvider,
    private statsService: StatsService
  ) {
    super('License', logger, Router({ mergeParams: true }))
    this.setupRoutes()
  }

  setupRoutes() {
    const router = this.router
    const svc = this.licenseService

    // this.router.get(
    //   '/telemetry',
    //   this.asyncMiddleware(async (req, res) => {
    //     const unsent = this.statsService.unsentTelemetry
    //     if (unsent.length) {
    //       res.send(unsent)
    //     } else {
    //       res.sendStatus(200)
    //     }
    //   })
    // )

    router.get(
      '/status',
      this.asyncMiddleware(async (req, res) => {
        const { tokenUser } = <RequestWithUser>req

        const unsent = this.statsService.getUnsentTelemetry()
        const response = { ...defaultResponse, telemetry: unsent }

        if (!process.IS_PRO_ENABLED) {
          return sendSuccess<LicensingStatus>(res, 'License status', { ...response, isPro: false })
        }

        const status = await svc.getLicenseStatus()
        if (!tokenUser || !tokenUser.isSuperAdmin) {
          return sendSuccess<LicensingStatus>(res, 'License status', {
            ...response,
            isPro: true,
            status: status.status
          })
        }

        // Only SuperAdmins can see the details of the server's license
        const clusterFingerprint = await svc.getFingerprint('cluster_url')

        let info: LicenseInfo | undefined
        try {
          info = await svc.getLicenseInfo()
        } catch (err) {}

        return sendSuccess<LicensingStatus>(res, 'License status', {
          ...response,
          fingerprints: {
            cluster_url: clusterFingerprint
          },
          license: info,
          ...status
        })
      })
    )

    router.post(
      '/update',
      assertSuperAdmin,
      this.asyncMiddleware(async (req, res) => {
        const result = await svc.replaceLicenseKey(req.body.licenseKey)
        if (!result) {
          throw new BadRequestError('Invalid License Key')
        }

        // We want to update the licenseKey in botpress.config.json if the user manually replaces its key
        const pro = {
          enabled: process.IS_PRO_ENABLED,
          licenseKey: req.body.licenseKey
        }
        await this.configProvider.mergeBotpressConfig({ pro })

        return sendSuccess(res, 'License Key updated')
      })
    )

    router.post(
      '/refresh',
      assertSuperAdmin,
      this.asyncMiddleware(async (req, res) => {
        await svc.refreshLicenseKey()
        return sendSuccess(res, 'License refreshed')
      })
    )
  }
}
