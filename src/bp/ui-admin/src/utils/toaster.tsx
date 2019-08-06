import { Intent, Position, Toaster } from '@blueprintjs/core'

export const AppToaster = Toaster.create({
  className: 'recipe-toaster',
  position: Position.TOP
})

export const toastSuccess = message => {
  AppToaster.show({ message, intent: Intent.SUCCESS, timeout: 2000 })
}

export const toastFailure = message => {
  AppToaster.show({ message, intent: Intent.DANGER })
}
