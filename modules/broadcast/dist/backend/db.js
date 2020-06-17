"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function padDigits(number, digits) {
  return Array(Math.max(digits - String(number).length + 1, 0)).join('0') + number;
}

class BroadcastDb {
  constructor(bp) {
    _defineProperty(this, "knex", void 0);

    this.knex = bp.database;
  }

  initialize() {
    return this.knex.createTableIfNotExists('broadcast_schedules', table => {
      table.increments('id').primary();
      table.string('botId');
      table.string('date_time');
      table.timestamp('ts');
      table.string('text');
      table.string('type');
      table.boolean('outboxed');
      table.boolean('errored');
      table.integer('total_count');
      table.integer('sent_count');
      table.timestamp('created_on');
      table.string('filters');
    }).then(() => {
      return this.knex.createTableIfNotExists('broadcast_outbox', table => {
        table.integer('scheduleId').references('broadcast_schedules.id').onDelete('CASCADE');
        table.integer('userId').unsigned().notNullable().references('id').inTable('srv_channel_users');
        table.primary(['scheduleId', 'userId']);
        table.string('botId');
        table.timestamp('ts');
      });
    });
  }

  async addSchedule({
    botId,
    date,
    time,
    timezone,
    content,
    type,
    filters
  }) {
    const dateTime = date + ' ' + time;
    let ts = undefined;

    if (timezone) {
      ts = (0, _moment.default)(new Date(dateTime + ' ' + timezone)).toDate();
    }

    const row = {
      botId,
      date_time: dateTime,
      ts: ts ? this.knex.date.format(ts) : undefined,
      text: content,
      type: type,
      outboxed: false,
      errored: false,
      total_count: 0,
      sent_count: 0,
      created_on: this.knex.date.now(),
      filters: JSON.stringify(filters)
    };
    return this.knex('broadcast_schedules').insert(row);
  }

  async updateSchedule({
    id,
    botId,
    date,
    time,
    timezone,
    content,
    type,
    filters
  }) {
    const dateTime = date + ' ' + time;
    let ts = undefined;

    if (timezone) {
      ts = (0, _moment.default)(new Date(dateTime + ' ' + timezone)).toDate();
    }

    const row = {
      date_time: dateTime,
      ts: ts ? this.knex.date.format(ts) : undefined,
      text: content,
      type: type,
      filters: JSON.stringify(filters)
    };
    await this.knex('broadcast_schedules').where({
      id,
      botId,
      outboxed: this.knex.bool.false()
    }).update(row);
  }

  async deleteSchedule(id) {
    await this.knex('broadcast_schedules').where({
      id
    }).delete();
    await this.knex('broadcast_outbox').where({
      scheduleId: id
    }).delete();
  }

  async listSchedules(botId) {
    return this.knex('broadcast_schedules').where({
      botId
    });
  }

  async getBroadcastSchedulesByTime(botId, upcomingFixedTime, upcomingVariableTime) {
    return this.knex('broadcast_schedules').where({
      botId,
      outboxed: this.knex.bool.false()
    }).andWhere(function () {
      this.where(function () {
        this.whereNotNull('ts').andWhere(upcomingFixedTime);
      }).orWhere(function () {
        this.whereNull('ts').andWhere(upcomingVariableTime);
      });
    });
  }

  async getUsersTimezone() {
    const attrs = await this.knex('srv_channel_users').select('attributes');
    const timezones = attrs.map(({
      attributes: {
        timezone
      }
    }) => timezone);
    return [...new Set(timezones)];
  }

  setBroadcastOutbox(botId, schedule, tz) {
    const initialTz = tz;
    const sign = Number(tz) >= 0 ? '+' : '-';
    tz = padDigits(Math.abs(Number(tz)), 2);
    const relTime = (0, _moment.default)(`${schedule['date_time']}${sign}${tz}`, 'YYYY-MM-DD HH:mmZ').toDate();
    const adjustedTime = this.knex.date.format(schedule['ts'] ? schedule['ts'] : relTime); // const whereClause = _.isNil(initialTz)
    //  ? 'where attributes->timezone IS NULL'
    //  : 'where attributes->>timezone = :initialTz'

    const sql = `insert into broadcast_outbox ("userId", "scheduleId", "botId", "ts")
      select userId, :scheduleId, :botId, :adjustedTime
      from (
        select id as userId
        from srv_channel_users
      ) as q1`;
    return this.knex.raw(sql, {
      scheduleId: schedule['id'],
      adjustedTime,
      initialTz,
      botId
    }).then();
  }

  async getOutboxCount(botId, schedule) {
    const result = await this.knex('broadcast_outbox').where({
      botId,
      scheduleId: schedule.id
    }).count('* as qty').first().then(result => result.qty);
    return typeof result === 'number' ? result : parseInt(result);
  }

  updateTotalCount(schedule, count) {
    return this.knex('broadcast_schedules').where({
      id: schedule.id
    }).update({
      outboxed: this.knex.bool.true(),
      total_count: count
    });
  }

  async getBroadcastOutbox(botId) {
    return this.knex('broadcast_outbox').whereRaw('broadcast_outbox.ts < ?', [this.knex.date.now()]).andWhere('broadcast_outbox.botId', botId).join('srv_channel_users', 'srv_channel_users.id', 'broadcast_outbox.userId').join('broadcast_schedules', 'scheduleId', 'broadcast_schedules.id').limit(1000).select(['srv_channel_users.user_id as userId', 'srv_channel_users.channel as platform', 'broadcast_schedules.text as text', 'broadcast_schedules.type as type', 'broadcast_schedules.id as scheduleId', 'broadcast_schedules.filters as filters', 'broadcast_outbox.ts as sendTime', 'broadcast_outbox.userId as scheduleUser']);
  }

  async deleteBroadcastOutbox(userId, scheduleId) {
    return this.knex('broadcast_outbox').where({
      userId,
      scheduleId
    }).delete();
  }

  async deleteBroadcastOutboxById(scheduleId) {
    return this.knex('broadcast_outbox').where({
      scheduleId
    }).delete();
  }

  async increaseBroadcastSentCount(id) {
    return this.knex('broadcast_schedules').where({
      id
    }).update({
      sent_count: this.knex.raw('sent_count + 1')
    });
  }

  async updateErrorField(scheduleId) {
    return this.knex('broadcast_schedules').where({
      id: scheduleId
    }).update({
      errored: this.knex.bool.true()
    });
  }

}

exports.default = BroadcastDb;
//# sourceMappingURL=db.js.map