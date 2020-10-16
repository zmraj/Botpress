import * as sdk from 'botpress/sdk'
import { Migration } from 'core/services/migration'
import _ from 'lodash'

const migration: Migration = {
  info: {
    description: 'Migrates multiple tables to add primary keys (will take some time)',
    target: 'core',
    type: 'database'
  },
  up: async ({ bp, database }: sdk.ModuleMigrationOpts): Promise<sdk.MigrationResult> => {
    const db = database.knex as sdk.KnexExtended
    const { client } = db.client.config

    const messages = ''
    let success = true
    const pkset = ['misunderstood', 'scheduler_tasks', 'tasks', 'telemetry']
    let TABLE_NAME

    for (TABLE_NAME of pkset) {
      // Declarations
      let tabEx
      const TEMP_TABLE_NAME = 'temp_' + TABLE_NAME
      let tableInfo
      let primaryKey
      const tableFields: string[] = []
      const i = 0

      // Does the table exist
      if (client === 'sqlite3') {
        tabEx = await db('sqlite_master')
          .where({ type: 'table', name: TABLE_NAME })
          .count()
      } else {
        tabEx = await db('information_schema.tables')
          .where({ table_name: TABLE_NAME })
          .count()
      }

      // Skip migration
      if (!tabEx[0].count) {
        messages.concat(`Table ${TABLE_NAME} does not exist, no migration needed.\n`)
        continue
      }

      // Check if primary key exists
      if (client === 'sqlite3') {
        tableInfo = await db.raw(`PRAGMA table_info([${TABLE_NAME}])`)
        primaryKey = tableInfo[0].pk
      } else {
        tableInfo = await db('information_schema.table_constraints')
          .where({ table_name: TABLE_NAME, constraint_type: 'PRIMARY KEY' })
          .count()
        primaryKey = tableInfo[0].count
        // Not necessary after all
        /*tableInfo = await db('information_schema.columns')
          .select('column_name as name')
          .where({ table_name: TABLE_NAME })*/
      }

      if (primaryKey) {
        // return { success: true, message: `Table ${TABLE_NAME} is already migrated` }
        messages.concat(`Table ${TABLE_NAME} is already migrated.\n`)
        continue
      } else {
        const tempTableExists = await bp.database.schema.hasTable(TEMP_TABLE_NAME)
        if (tempTableExists) {
          // return { success: false, message: `Temporary table already exists - drop it (${TEMP_TABLE_NAME})` }
          messages.concat(`Temporary table already exists - drop it and retry. (${TEMP_TABLE_NAME})\n`)
          continue
        }
      }

      if (client === 'sqlite3') {
        // Get table fields, required for migration?
        /*
        for (i = 0; i < tableInfo.length; i++) {
          tableFields.push(tableInfo[i].name)
        }
        // Find out if data exists in table

      const dataToMigrateQuery = await db(TABLE_NAME)
        .count()
        .first()
      const dataToMigrate = dataToMigrateQuery!.count == 0 ? 0 : 1

      if (dataToMigrate) {*/
        // migration

        try {
          await db.transaction(async trx => {
            if ((TABLE_NAME = 'misunderstood')) {
              await db.schema.transacting(trx).createTable(TEMP_TABLE_NAME, table => {
                table.increments('id').primary()
                table.string('eventId')
                table.string('botId')
                table.string('language')
                table.string('preview')
                // Could not compile with imported types as we do in the table's definition, hardcoded the lists instead.
                table.enum('reason', ['auto_hook', 'action', 'manual'])
                table.enum('status', ['new', 'applied', 'deleted', 'pending']).defaultTo('new')
                table.enum('resolutionType', ['qna', 'intent'])
                table.string('resolution')
                table.json('resolutionParams')
                table.timestamp('createdAt').defaultTo(db.fn.now())
                table.timestamp('updatedAt').defaultTo(db.fn.now())
              })
            } else if ((TABLE_NAME = 'scheduler_tasks')) {
              await db.schema.transacting(trx).createTable(TEMP_TABLE_NAME, table => {
                table.increments('id').primary()
                table
                  .string('scheduleId')
                  .references('scheduler_schedules.id')
                  .onDelete('CASCADE')
                table.timestamp('scheduledOn')
                table.string('status')
                table.string('logs')
                table.timestamp('finishedOn')
                table.string('returned')
                table.unique(['scheduleId', 'scheduledOn'])
              })
            } else if ((TABLE_NAME = 'tasks')) {
              await db.schema.transacting(trx).createTable(TEMP_TABLE_NAME, table => {
                table.increments('id').primary()
                table.string('eventId').notNullable()
                table.string('status').notNullable()
                table.string('actionName').notNullable()
                table.json('actionArgs').notNullable()
                table.string('actionServerId').notNullable()
                table.integer('statusCode')
                table.timestamp('startedAt').notNullable()
                table.timestamp('endedAt').notNullable()
                table.string('failureReason')
              })
            } else if ((TABLE_NAME = 'telemetry')) {
              await db.schema.transacting(trx).createTable(TEMP_TABLE_NAME, table => {
                table.uuid('uuid').primary()
                table.json('payload').notNullable()
                table.boolean('available').notNullable()
                table.timestamp('lastChanged').notNullable()
                table.timestamp('creationDate').notNullable()
              })
            }

            const rows = await db<sdk.IO.StoredEvent>(TABLE_NAME)
              .select('*')
              .transacting(trx)

            if (rows.length) {
              await db.batchInsert(TEMP_TABLE_NAME, rows, 30).transacting(trx)
            }
            // Drop old table and rename temp
            await database.knex.schema.transacting(trx).dropTable(TABLE_NAME)
            await database.knex.schema.transacting(trx).renameTable(TEMP_TABLE_NAME, TABLE_NAME)
          })
        } catch (err) {
          bp.logger.attachError(err).error(`Could not migrate ${TABLE_NAME} table`)
          // return { success: false, message: `Could not migrate ${TABLE_NAME} table` }
          messages.concat(`Could not migrate ${TABLE_NAME} table, check error and retry.\n`)
          success = false
        }
      } else {
        // Postgres alter table
        if ((TABLE_NAME = 'telemetry')) {
          await db.raw(`ALTER table ${TABLE_NAME} ADD PRIMARY KEY ("uuid")`)
        } else {
          await db.raw(`ALTER table ${TABLE_NAME} ADD PRIMARY KEY ("id")`)
        }
      }
    }

    return { success: success, message: messages }
    // return { success: true, message: 'Database updated successfully' }
  }
}

export default migration
