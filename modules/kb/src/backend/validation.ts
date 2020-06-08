import Joi from 'joi'

export const KbEntry = Joi.object().keys({
  id: Joi.string()
    .required()
    .not()
    .empty(),
  version: Joi.number()
    .required()
    .positive(),
  title: Joi.object()
    .required()
    .pattern(
      /[A-Z]{1,3}/i,
      Joi.string()
        .required()
        .not()
        .empty()
    ),
  source: Joi.object()
    .optional()
    .pattern(
      /[A-Z]{1,3}/i,
      Joi.string()
        .required()
        .not()
        .empty()
    ),
  content: Joi.object()
    .required()
    .pattern(
      /[A-Z]{1,3}/i,
      Joi.array().items(
        Joi.string()
          .required()
          .not()
          .empty()
      )
    ),
  feedback: Joi.object()
    .optional()
    .default({})
    .pattern(
      /[A-Z]{1,3}/i,
      Joi.array().items(
        Joi.object().keys({
          utterance: Joi.string()
            .required()
            .not()
            .empty(),
          polarity: Joi.bool().required(),
          approved: Joi.bool().default(false)
        })
      )
    )
})
