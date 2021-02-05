export class TrainingCanceled extends Error {}
export function isTrainingCanceled(err: Error): err is TrainingCanceled {
  return err instanceof TrainingCanceled
}

export class TrainingAlreadyStarted extends Error {}
export function isTrainingAlreadyStarted(err: Error): err is TrainingAlreadyStarted {
  return err instanceof TrainingAlreadyStarted
}

export class ModelLoadingError extends Error {
  constructor(component: string, innerError: Error | undefined) {
    super(`${component} could load model. Inner error is: "${innerError?.message}"`)
  }
}
