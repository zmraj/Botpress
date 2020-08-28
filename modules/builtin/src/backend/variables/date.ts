import sdk from 'botpress/sdk'
import { BaseVariable } from 'common/variables'
import moment from 'moment'

import common from './common'

type BoxedDateType = string | Date | moment.Moment

interface DateConfig {
  format: string
}

interface VariableDate extends sdk.BoxedVariable<BoxedDateType, DateConfig> {
  equals: (otherDate: Date) => boolean
  isBefore: (otherDate: Date) => boolean
  /** Return true if the provided date is after the current one */
  isAfter: (otherDate: Date) => boolean
}

class BoxedDate extends BaseVariable<BoxedDateType, DateConfig> implements VariableDate {
  constructor(args) {
    super(args)
  }

  trySet(value: BoxedDateType, confidence?: number) {
    try {
      this._value = moment(value).toDate()
      this._confidence = confidence ?? +moment(value).isValid()
    } catch (err) {
      this._confidence = 0
    }
  }

  compare(compareTo: sdk.BoxedVariable<BoxedDateType, DateConfig>) {
    const dateA = this.value
    const dateB = moment(compareTo.value)

    if (dateA > dateB) {
      return 1
    } else if (dateA < dateB) {
      return -1
    }

    return 0
  }

  isBefore(value) {
    return true
  }

  isAfter(value) {
    return true
  }

  equals(value) {
    return true
  }

  toString(customFormat?: string) {
    return moment(this._value).format(customFormat ?? this._config?.format ?? 'YYYY-MM-DD')
  }
}

const definition: sdk.PrimitiveVarType = {
  id: 'date',
  config: {
    label: 'date',
    icon: 'calendar',
    fields: [
      ...common.fields,
      {
        type: 'text',
        key: 'format',
        label: 'format'
      }
    ],
    advancedSettings: common.advancedSettings
  },
  box: BoxedDate
}

export default definition
