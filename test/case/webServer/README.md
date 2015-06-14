
### Example: static web server

We "import" an HTTP request from an Express server via the `httpImporter` processor:
```yaml
description: Express webserver to import HTTP requests
loggerLevel: debug
port: 8888
timeout: 2000 # ms
route:
- router.regexpRouter.testpaths
```
where since we expect to serve static files, the timeout is relatively low.

Code snippet from the `httpImporter.js` implementation:
```javascript
app = express();
app.listen(config.port);
app.get('/*', async (req, res) => {
   try {
      seq += 1;
      let meta = {type: 'express', id: seq};
      let response = await redix.import(req, meta, config);
      assert(response, 'no response');
      assert(response.statusCode, 'no statusCode');
```

This listens on port `8888,` accepts an HTTP request, and produces a message as follows:
```json
{
   "url": "/test.txt",
   "method": "GET",
   "host": "localhost"
}
```
where this mirrors the ExpressJS `req.`

We forward the request to a `regexpRouter.testpaths` for our web server:
```yaml
description: Route HTTP messages
rules:
- description: Private
  pluck: url
  regexp: ^/private
  response:
    statusCode: 403
    content: Access forbidden
- description: Test
  pluck: url
  regexp: ^/test.txt$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
- description: Home
  pluck: url
  regexp: ^/index.html$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
- description: Unsupported route
  pluck: url
  regexp: .*
  route:
  - router.regexpRouter.forbidden
```
where we specify of list of `rules.`

The `regexpRouter` will pluck the URL from message, which is an the ExpressJS request, and match it against RegExp rules.

We can hard-code an HTTP response e.g. 403 for "Access forbidden," or route the message to other processors, perhaps through filters and translators.

The `translator.expressFile.singleton` translates Express messages into "file" messages for the `fileServer,` e.g. the `url` is taken as the file path:
```json
{
   "path": "/test.txt"
}
```

Finally our `fileServer` serves files:
```yaml
description: serve files e.g. for a static webserver
root: /var/redixweb/root
index: index.html
fallback: index.html
```
where `root` is the file directory containing the static resources.

## Virtual host router

A `regexpRouter` processor rule can be configured for virtual hosts as follows:
```yaml
- description: Route localhost to a file server
  pluck: host
  regexp: ^localhost$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
```


## Conclusion

We compose a web server using relatively simple processors. Those are sometimes fairly generic e.g. the RegExp message router.

We take the approach of building of a "complex" system via the "simple" configuration of "small" components.

One can replicate much of the functionality of Nginx for example, e.g. by implementing processors as required and wiring these anyhow.

As further use-case examples, we intend to implement processors to support HTTP redirect, proxy, load balancing, caching and HTTPS termination. While each of these processors is relatively simple, clearly their composition can be quite useful.

While a custom Node script can achieve a desired process on its own, it is interesting to enable a custom server to be composed via configuration. Naturally custom Node processors can leverage third-party `npm` modules e.g. ExpressJS "middleware."


## Learn more

Redix routing:
- https://github.com/evanx/redixrouter/blob/master/docs/redisRouting.md

Redix processor implementations:
- https://github.com/evanx/redixrouter/blob/master/processors/