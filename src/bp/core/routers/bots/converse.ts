import { IO, Logger } from 'botpress/sdk'
import { StandardError } from 'common/http'
import HTTPServer from 'core/server'
import AuthService, { TOKEN_AUDIENCE } from 'core/services/auth/auth-service'
import { ConverseResult, ConverseService } from 'core/services/converse'
import { RequestHandler, Router } from 'express'
import joi from 'joi'
import _ from 'lodash'

import { CustomRouter } from '../customRouter'
import { checkTokenHeader } from '../util'

// this schema ensures a non breaking api signature (> 11.5)
// see https://botpress.com/docs/build/channels/#usage-public-api
const conversePayloadSchema = {
  type: joi.string().valid('text'), // add other types as we need
  text: joi.string().required(),
  includedContexts: joi
    .array()
    .items(joi.string())
    .optional()
    .default(['global'])
}

export class ConverseRouter extends CustomRouter {
  private checkTokenHeader!: RequestHandler

  constructor(
    logger: Logger,
    private converseService: ConverseService,
    private authService: AuthService,
    private httpServer: HTTPServer
  ) {
    super('Converse', logger, Router({ mergeParams: true }))
    this.checkTokenHeader = checkTokenHeader(this.authService, TOKEN_AUDIENCE)
    this.setupRoutes()
  }

  setupRoutes() {
    this.router.post(
      '/:userId',
      this.httpServer.extractExternalToken,
      this.asyncMiddleware(async (req, res) => {
        try {
          await joi.validate(req.body, conversePayloadSchema)
        } catch (err) {
          throw new StandardError('Invalid payload', err)
        }
        const { userId, botId } = req.params

        const rawOutput = await this.converseService.sendMessage(
          botId,
          userId,
          _.omit(req.body, ['includedContexts']),
          req.credentials,
          req.body.includedContexts || ['global']
        )

        const formatedOutput = this.prepareResponse(rawOutput, 'responses')
        return res.json(formatedOutput)
      })
    )

    this.router.post(
      '/:userId/secured',
      this.checkTokenHeader,
      // Secured endpoint does not validate schema on purpose
      // DO NOT add this middleware: this.validatePayload
      // This is to validate user-created (non-trusted) payloads only
      this.httpServer.extractExternalToken,
      this.asyncMiddleware(async (req, res) => {
        const { userId, botId } = req.params

        const rawOutput = await this.converseService.sendMessage(
          botId,
          userId,
          _.omit(req.body, ['includedContexts']),
          req.credentials,
          req.body.includedContexts || ['global']
        )
        const formatedOutput = this.prepareResponse(rawOutput, <string>req.query.include)

        return res.json(formatedOutput)
      })
    )
  }

  private prepareResponse(output: ConverseResult, params?: string) {
    const parts = params?.toLowerCase().split(',') ?? []
    return parts.length ? _.pick(output, parts) : output
  }
}
