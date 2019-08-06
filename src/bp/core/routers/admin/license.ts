import { Logger } from 'botpress/sdk'
import LicensingService, { LicenseInfo, LicensingStatus } from 'common/licensing-service'
import { RequestWithUser } from 'common/typings'
import { ConfigProvider } from 'core/config/config-loader'
import { Router } from 'express'
import _ from 'lodash'

import { CustomRouter } from '../customRouter'
import { assertSuperAdmin, success as sendSuccess } from '../util'

const defaultResponse: LicensingStatus = {
  breachReasons: [],
  policyResults: [],
  status: 'licensed',
  isBuiltWithPro: process.IS_PRO_AVAILABLE,
  isPro: process.IS_PRO_ENABLED
}

// TODO CLEANUP HERE
export class LicenseRouter extends CustomRouter {
  constructor(logger: Logger, private licenseService: LicensingService, private configProvider: ConfigProvider) {
    super('License', logger, Router({ mergeParams: true }))
    this.setupRoutes()
  }

  setupRoutes() {
    const router = this.router
    const svc = this.licenseService

    router.get(
      '/status',
      this.asyncMiddleware(async (req, res) => {
        const { tokenUser } = <RequestWithUser>req

        if (!process.IS_PRO_ENABLED) {
          return sendSuccess<LicensingStatus>(res, 'License status', defaultResponse)
        }

        const status = await svc.getLicenseStatus(req.workspace!)
        if (!tokenUser || !tokenUser.isSuperAdmin) {
          return sendSuccess<LicensingStatus>(res, 'License status', { ...defaultResponse, status: status.status })
        }

        let info: LicenseInfo | undefined
        try {
          const license = await svc.findWorkspaceLicense(req.workspace!)
          if (!license || !license.licenseKey) {
            return sendSuccess<LicensingStatus>(res, 'License status', { ...defaultResponse, ...status })
          }

          info = await svc.getLicenseInfo(license.licenseKey)
        } catch (err) {
          console.log(err)
        }

        return sendSuccess<LicensingStatus>(res, 'License status', { ...defaultResponse, ...status, license: info })
      })
    )

    router.post(
      '/validate',
      this.asyncMiddleware(async (req, res) => {
        res.send(await svc.getLicenseInfo(req.body.licenseKey))
      })
    )

    router.post(
      '/new',
      this.asyncMiddleware(async (req, res) => {
        const { licenseKey, filename } = req.body

        if (await svc.getLicenseInfo(licenseKey)) {
          await svc.addNewKey(licenseKey, req.workspace)
          return res.sendStatus(200)
        }
        res.sendStatus(400)
      })
    )

    router.get(
      '/keys',
      this.asyncMiddleware(async (req, res) => {
        res.send(await svc.getAllLicenses())
      })
    )

    router.put(
      '/',
      assertSuperAdmin,
      this.asyncMiddleware(async (req, res) => {
        if (!req.workspace || !req.body.filename) {
          return res.status(400).send(`Workspace and key name is required.`)
        }

        try {
          await svc.setWorkspaceKey(req.workspace!, req.body.filename)
          return sendSuccess(res, 'License Key updated')
        } catch (err) {
          res.status(400).send(`Could not set key for workspace.`)
        }
      })
    )

    router.post(
      '/refresh',
      assertSuperAdmin,
      this.asyncMiddleware(async (req, res) => {
        await svc.refreshLicenseKey(req.workspace)
        return sendSuccess(res, 'License refreshed')
      })
    )
  }
}
