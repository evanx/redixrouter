
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

const Paths = requireRedex('lib/Paths');
const RedexConfigs = requireRedex('lib/RedexConfigs');

const { redex } = global;

export default function expressRouter(config, redex) {

   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.gets, 'gets');
   if (config.posts) {
   }

   let logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});
   let startTime = new Date().getTime();
   let count = 0;
   let gets;
   let app;

   init();

   function init() {
      assert(config.gets, 'config: gets');
      assert(config.gets.length, 'config: gets length');
      gets = lodash(config.gets)
      .filter(item => !item.disabled)
      .map(initPath)
      .value();
      logger.info('start', gets.map(item => item.label));
   }

   function initPath(item) {
      if (item.route) {
         redex.resolveRoute(item.route, config.processorName, item.label);
      } else if (item.response) {
         assert(item.response.statusCode, 'item response statusCode');
      } else {
         assert(false, 'item requires route or response: ' + item.label);
      }
      if (item.match) {
         if (item.match !== 'all') {
            throw {message: 'unsupported match: ' + item.match};
         }
         return item;
      } else if (item.path) {
         logger.debug('item path', item.path, item);
         return item;
      } else {
         assert(false, 'item requires path or match: ' + item.label);
      }
   }

   function matchUrl(message) {
      logger.debug('match', gets.length);
      return lodash.find(gets, item => {
         //logger.debug('match item', item.label);
         if (item.match === 'all') {
            return true;
         } else if (item.path) {
            let value = message.url;
            return item.path.test(value);
         } else {
            logger.warn('match none', item);
            return false;
         }
      });
   }

   function sendResponse(path, req, res, response) {
      assert(response, 'no response');
      assert(response.statusCode, 'no statusCode');
      res.status(response.statusCode);
      if (response.content) {
         if (!response.contentType) {
            logger.warn('no contentType', response.dataType, typeof response.content);
            response.contentType = Paths.defaultContentType;
         }
         logger.debug('response content:', response.dataType, response.contentType, typeof response.content);
         if (response.dataType === 'json') {
            assert(lodash.isObject(response.content), 'content is object');
            assert(/json$/.test(response.contentType), 'json contentType');
            res.json(response.content);
         } else {
            res.contentType(response.contentType);
            if (response.dataType === 'string') {
               assert.equal(typeof response.content, 'string', 'string content');
               res.send(response.content);
            } else if (response.dataType === 'Buffer') {
               assert.equal(response.content.constructor.name, 'Buffer', 'Buffer content');
               res.send(response.content);
            } else {
               assert(false, 'content dataType: ' + response.dataType);
            }
         }
      } else if (response.statusCode === 200) {
         logger.debug('no content');
         res.send();
      } else {
         logger.debug('statusCode', response.statusCode);
         res.send();
      }
   }

   function sendError(path, req, res, error) {
      if (error.name === 'AssertionError') {
         error = {name: err.name, message: err.message};
      }
      logger.warn('error', error);
      res.status(500).send(error);
   }

   app = express();
   app.listen(config.port);
   logger.info('listen', config.port);
   gets.forEach(item => {
      logger.info('path', item.path);
      assert(item.path, 'path: ' + item.label);
      assert(lodash.startsWith(item.path, '/'), 'absolute path: ' + item.path);
      app.get(path, async (req, res) => {
         logger.debug('req', req.url);
         try {
            count += 1;
            let id = startTime + count;
            let meta = {type: 'express', id: id, host: req.hostname};
            let response = await redex.import(req, meta, config);
            sendResponse(path, req, res, response);
         } catch (error) {
            sendError(path, req, res, error);
         }
      });
   });

   const methods = {
      get state() {
         return { config, id };
      },
   };

   return methods;
}