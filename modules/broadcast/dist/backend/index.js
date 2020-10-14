"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("bluebird-global");

var _en = _interopRequireDefault(require("../translations/en.json"));

var _fr = _interopRequireDefault(require("../translations/fr.json"));

var _api = _interopRequireDefault(require("./api"));

var _daemon = _interopRequireDefault(require("./daemon"));

var _db = _interopRequireDefault(require("./db"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let db;

const onServerStarted = async bp => {
  db = new _db.default(bp);
  await db.initialize();
};

const onServerReady = async bp => {
  await (0, _api.default)(bp, db);
};

const onBotMount = async (bp, botId) => {
  await (0, _daemon.default)(botId, bp, db);
};

const entryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  translations: {
    en: _en.default,
    fr: _fr.default
  },
  definition: {
    name: 'broadcast',
    menuIcon: 'settings_input_antenna',
    menuText: 'Broadcast',
    fullName: 'Broadcast',
    homepage: 'https://botpress.com'
  }
};
var _default = entryPoint;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbImRiIiwib25TZXJ2ZXJTdGFydGVkIiwiYnAiLCJCcm9hZGNhc3REYiIsImluaXRpYWxpemUiLCJvblNlcnZlclJlYWR5Iiwib25Cb3RNb3VudCIsImJvdElkIiwiZW50cnlQb2ludCIsInRyYW5zbGF0aW9ucyIsImVuIiwiZnIiLCJkZWZpbml0aW9uIiwibmFtZSIsIm1lbnVJY29uIiwibWVudVRleHQiLCJmdWxsTmFtZSIsImhvbWVwYWdlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBR0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBQ0E7Ozs7QUFFQSxJQUFJQSxFQUFKOztBQUVBLE1BQU1DLGVBQWUsR0FBRyxNQUFPQyxFQUFQLElBQTBCO0FBQ2hERixFQUFBQSxFQUFFLEdBQUcsSUFBSUcsV0FBSixDQUFnQkQsRUFBaEIsQ0FBTDtBQUNBLFFBQU1GLEVBQUUsQ0FBQ0ksVUFBSCxFQUFOO0FBQ0QsQ0FIRDs7QUFLQSxNQUFNQyxhQUFhLEdBQUcsTUFBT0gsRUFBUCxJQUEwQjtBQUM5QyxRQUFNLGtCQUFJQSxFQUFKLEVBQVFGLEVBQVIsQ0FBTjtBQUNELENBRkQ7O0FBSUEsTUFBTU0sVUFBVSxHQUFHLE9BQU9KLEVBQVAsRUFBdUJLLEtBQXZCLEtBQXlDO0FBQzFELFFBQU0scUJBQU9BLEtBQVAsRUFBY0wsRUFBZCxFQUFrQkYsRUFBbEIsQ0FBTjtBQUNELENBRkQ7O0FBSUEsTUFBTVEsVUFBZ0MsR0FBRztBQUN2Q1AsRUFBQUEsZUFEdUM7QUFFdkNJLEVBQUFBLGFBRnVDO0FBR3ZDQyxFQUFBQSxVQUh1QztBQUl2Q0csRUFBQUEsWUFBWSxFQUFFO0FBQUVDLElBQUFBLEVBQUUsRUFBRkEsV0FBRjtBQUFNQyxJQUFBQSxFQUFFLEVBQUZBO0FBQU4sR0FKeUI7QUFLdkNDLEVBQUFBLFVBQVUsRUFBRTtBQUNWQyxJQUFBQSxJQUFJLEVBQUUsV0FESTtBQUVWQyxJQUFBQSxRQUFRLEVBQUUsd0JBRkE7QUFHVkMsSUFBQUEsUUFBUSxFQUFFLFdBSEE7QUFJVkMsSUFBQUEsUUFBUSxFQUFFLFdBSkE7QUFLVkMsSUFBQUEsUUFBUSxFQUFFO0FBTEE7QUFMMkIsQ0FBekM7ZUFjZVQsVSIsInNvdXJjZVJvb3QiOiIvbW50L0RvY3VtZW50cy9Qcm9qZXRzL0JvdFByZXNzL2JvdHByZXNzL21vZHVsZXMvYnJvYWRjYXN0L3NyYy9iYWNrZW5kIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdibHVlYmlyZC1nbG9iYWwnXG5pbXBvcnQgKiBhcyBzZGsgZnJvbSAnYm90cHJlc3Mvc2RrJ1xuXG5pbXBvcnQgZW4gZnJvbSAnLi4vdHJhbnNsYXRpb25zL2VuLmpzb24nXG5pbXBvcnQgZnIgZnJvbSAnLi4vdHJhbnNsYXRpb25zL2ZyLmpzb24nXG5cbmltcG9ydCBhcGkgZnJvbSAnLi9hcGknXG5pbXBvcnQgRGFlbW9uIGZyb20gJy4vZGFlbW9uJ1xuaW1wb3J0IEJyb2FkY2FzdERiIGZyb20gJy4vZGInXG5cbmxldCBkYlxuXG5jb25zdCBvblNlcnZlclN0YXJ0ZWQgPSBhc3luYyAoYnA6IHR5cGVvZiBzZGspID0+IHtcbiAgZGIgPSBuZXcgQnJvYWRjYXN0RGIoYnApXG4gIGF3YWl0IGRiLmluaXRpYWxpemUoKVxufVxuXG5jb25zdCBvblNlcnZlclJlYWR5ID0gYXN5bmMgKGJwOiB0eXBlb2Ygc2RrKSA9PiB7XG4gIGF3YWl0IGFwaShicCwgZGIpXG59XG5cbmNvbnN0IG9uQm90TW91bnQgPSBhc3luYyAoYnA6IHR5cGVvZiBzZGssIGJvdElkOiBzdHJpbmcpID0+IHtcbiAgYXdhaXQgRGFlbW9uKGJvdElkLCBicCwgZGIpXG59XG5cbmNvbnN0IGVudHJ5UG9pbnQ6IHNkay5Nb2R1bGVFbnRyeVBvaW50ID0ge1xuICBvblNlcnZlclN0YXJ0ZWQsXG4gIG9uU2VydmVyUmVhZHksXG4gIG9uQm90TW91bnQsXG4gIHRyYW5zbGF0aW9uczogeyBlbiwgZnIgfSxcbiAgZGVmaW5pdGlvbjoge1xuICAgIG5hbWU6ICdicm9hZGNhc3QnLFxuICAgIG1lbnVJY29uOiAnc2V0dGluZ3NfaW5wdXRfYW50ZW5uYScsXG4gICAgbWVudVRleHQ6ICdCcm9hZGNhc3QnLFxuICAgIGZ1bGxOYW1lOiAnQnJvYWRjYXN0JyxcbiAgICBob21lcGFnZTogJ2h0dHBzOi8vYm90cHJlc3MuY29tJ1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGVudHJ5UG9pbnRcbiJdfQ==