'use strict';

var async = require('async');
var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  async.series([

    function(cb) {
      db.createTable('project', {
        id: {
          type: 'int',
          primaryKey: true,
          autoIncrement: true,
          notNull: true
        },

        requestNumber: {
          type: 'text'
        },

        requestCreatedAt: {
          type: 'bigint'
        },

        lastActivityAt: {
          type: 'bigint'
        },

        title: {
          type: 'text',
          notNull: true
        },

        equipment: {
          type: 'text',
          notNull: true
        },

        repairType: {
          type: 'text',
          notNull: true
        },

        currentStage: {
          type: 'text',
          defaultValue: 'request-received'
        },

        currentStageNote: {
          type: 'text',
          defaultValue: ''
        },

        stages: {
          type: 'json',
          defaultValue: '[]'
        },

        photos: {
          type: 'json',
          defaultValue: '{"before":[],"after":[]}'
        },

        description: {
          type: 'text',
          defaultValue: ''
        },

        isVisible: {
          type: 'boolean',
          defaultValue: true
        },

        createdAt: {
          type: 'bigint'
        },

        updatedAt: {
          type: 'bigint'
        }
      }, cb);
    }

  ], callback);
};

exports.down = function(db, callback) {
  async.series([
    function(cb) {
      db.dropTable('project', cb);
    }
  ], callback);
};

exports._meta = {
  "version": 1
};
