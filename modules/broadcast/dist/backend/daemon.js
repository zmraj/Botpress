"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _bluebird = require("bluebird");

var _bluebirdRetry = _interopRequireDefault(require("bluebird-retry"));

var _lodash = _interopRequireDefault(require("lodash"));

var _moment = _interopRequireDefault(require("moment"));

var _ms = _interopRequireDefault(require("ms"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const INTERVAL_BASE = 10 * 1000;
const SCHEDULE_TO_OUTBOX_INTERVAL = INTERVAL_BASE * 1;
const SEND_BROADCAST_INTERVAL = INTERVAL_BASE * 1;

var _default = async (botId, bp, db) => {
  const emitChanged = _lodash.default.throttle(() => {
    bp.realtime.sendPayload(bp.RealTimePayload.forAdmins('broadcast.changed', {}));
  }, 1000);

  const _sendBroadcast = _bluebird.Promise.method((botId, row) => {
    let dropPromise = _bluebird.Promise.resolve(false);

    if (row.filters) {
      dropPromise = _bluebird.Promise.mapSeries(JSON.parse(row.filters), filter => {
        let fnBody = filter.trim();

        if (!/^return /i.test(fnBody)) {
          fnBody = 'return ' + fnBody;
        }

        const fn = new Function('bp', 'userId', 'channel', fnBody);
        return !fn(bp, row.userId, row.platform);
      }).then(values => {
        return _lodash.default.some(values, v => {
          if (!_lodash.default.isBoolean(v)) {
            bp.logger.warn('Filter returned something other ' + 'than a boolean (or a Promise of a boolean)');
          }

          return typeof v !== 'undefined' && v !== null;
        });
      });
    }

    return dropPromise.then(async drop => {
      if (drop) {
        bp.logger.debug(`Drop sending #${row.scheduleId} to user: ${row.userId}. Reason = Filters`);
        return;
      }

      const botInfo = await bp.bots.getBotById(botId);
      const user = await bp.users.getOrCreateUser(row.platform, row.userId, botId);
      let language = botInfo.defaultLanguage;

      if (user.result.attributes.language) {
        language = user.result.attributes.language;
      }

      const event = {
        state: {
          user: {
            language: language
          }
        }
      };
      const eventDestination = {
        channel: row.platform,
        botId,
        target: row.userId
      };
      const payloads = await bp.cms.renderElement(`!${row.text}`, {
        event
      }, eventDestination);

      for (const payload of payloads) {
        await bp.events.sendEvent(bp.IO.Event({ ...eventDestination,
          direction: 'outgoing',
          type: _lodash.default.get(payload, 'type', 'default'),
          payload
        }));
      }
    });
  });

  const trySendBroadcast = async broadcast => {
    const {
      scheduleId,
      scheduleUser
    } = broadcast;
    await (0, _bluebirdRetry.default)(() => _sendBroadcast(botId, broadcast), {
      max_tries: 3,
      interval: 1000,
      backoff: 3
    });
    await db.deleteBroadcastOutbox(scheduleUser, scheduleId);
    await db.increaseBroadcastSentCount(scheduleId);
  };

  const handleFailedSending = async (err, scheduleId) => {
    bp.logger.error(`Broadcast #${scheduleId}' failed. Broadcast aborted. Reason: ${err.message}`);
    await bp.notifications.create(botId, {
      botId,
      level: 'error',
      message: 'Broadcast #' + scheduleId + ' failed.' + ' Please check logs for the reason why.'
    });
    await db.updateErrorField(scheduleId);
    await db.deleteBroadcastOutboxById(scheduleId);
  };

  const scheduleToOutbox = async botId => {
    const schedulingLock = await bp.distributed.acquireLock(`broadcast/lock/scheduling_${botId}`, (0, _ms.default)('5m'));

    if (!schedulingLock) {
      return;
    }

    try {
      const inFiveMinutes = (0, _moment.default)().add(5, 'minutes').toDate();
      const endOfDay = (0, _moment.default)(inFiveMinutes).add(14, 'hours').toDate();
      const upcomingFixedTime = db.knex.date.isAfter(inFiveMinutes, 'ts');
      const upcomingVariableTime = db.knex.date.isAfter(endOfDay, 'date_time');
      const schedules = await db.getBroadcastSchedulesByTime(botId, upcomingFixedTime, upcomingVariableTime);
      await _bluebird.Promise.map(schedules, async schedule => {
        const timezones = await db.getUsersTimezone();
        await _bluebird.Promise.mapSeries(timezones, async tz => {
          await db.setBroadcastOutbox(botId, schedule, tz);
          const count = await db.getOutboxCount(botId, schedule);
          await db.updateTotalCount(schedule, count);
          bp.logger.info('Scheduled broadcast #' + schedule.id, '. [' + count + ' messages]');

          if (schedule.filters && JSON.parse(schedule.filters).length > 0) {
            bp.logger.info(`Filters found on broadcast #${schedule.id}. Filters are applied at sending time.`);
          }

          emitChanged();
        });
      });
    } finally {
      await schedulingLock.unlock();
    }
  };

  const sendBroadcasts = async botId => {
    try {
      const sendingLock = await bp.distributed.acquireLock(`broadcast/lock/sending_${botId}`, (0, _ms.default)('5m'));

      if (!sendingLock) {
        return;
      }

      try {
        const broadcasts = await db.getBroadcastOutbox(botId);
        let abort = false;
        await _bluebird.Promise.mapSeries(broadcasts, async broadcast => {
          if (abort) {
            return;
          }

          try {
            await trySendBroadcast(broadcast);
          } catch (err) {
            abort = true;
            await handleFailedSending(err, broadcast.scheduleId);
          } finally {
            emitChanged();
          }
        });
      } finally {
        await sendingLock.unlock();
      }
    } catch (error) {
      bp.logger.error('Broadcast sending error: ', error.message);
    }
  };

  setInterval(scheduleToOutbox.bind(undefined, botId), SCHEDULE_TO_OUTBOX_INTERVAL);
  setInterval(sendBroadcasts.bind(undefined, botId), SEND_BROADCAST_INTERVAL);
};

exports.default = _default;
//# sourceMappingURL=daemon.js.map