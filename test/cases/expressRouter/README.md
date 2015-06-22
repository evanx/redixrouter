
## ExpressJS HTTP importer with built-in path router

This processor leverages ExpressJS, and is a combined HTTP importer and router.

In this case, we have chosen to configure all the processors' `configs` in a single YAML file as follows:

```yaml
label: Meta config for static web server
loggerLevel: debug
configs:
- processorName: http.importer.expressRouter.singleton
  label: Express HTTP importer with builtin router
  port: 8880
  timeout: 30000
  gets:
  - label: Response with Redex processors' state in JSON
    path: /redex
    route:
    - redex.state.singleton
    disabled: false
  - label: Reject this path with 403 (Access prohibited)
    path: /private
    response:
      statusCode: 403
      content: Sorry, forbidden
  - label: Otherwise to file server
    path: /
    route:
    - http.renderer.markdown.singleton # will render README.md to HTML
    - http.translator.file.singleton
    - file.server.simple.singleton

- processorName: redex.state.singleton
- processorName: http.renderer.markdown.singleton
- processorName: http.translator.file.singleton

- processorName: file.server.simple.singleton
  root: . # cwd
  index: README.md
```

### Implementation

See the implementation of the `http.importer.expressRouter` processor:
https://github.com/evanx/redex/blob/master/processors/http/importer/expressRouter.js

We add each configured `path` for HTTP GET methods to the ExpressJS `app` as follows.
```javascript
function add(item) {
   assert(item.path, 'path: ' + item.label);
   assert.equal(item.path[0], '/', 'absolute path: ' + item.path);
   app.get(item.path, async (req, res) => {
      try {
         let meta = {type: 'express'};
         if (item.route) {
            let response = await redex.import(req, meta, {
               processorName: config.processorName,
               timeout: item.timeout || config.timeout,
               route: item.route,
            });
            sendResponse(item, req, res, response);
         } else if (item.response) {
            sendResponseStatus(item, req, res, item.response);
         } else {
            assert(false, 'no route or response: ' + item.label);
         }
      } catch (error) {
         sendError(item, req, res, error);
      }
   });
}
```

### Running

We run this configuration using the following script:
```shell
evans@boromir:~/redex$ cat scripts/expressRouter.run.sh
  nodejs index.js test/cases/expressRouter/expressRouter.yaml | bunyan -o short
```

Then try the following in your browser:
- [http://localhost:8880](http://localhost:8880)
- [http://localhost:8880/redex](http://localhost:8880/redex)

Notes:
- the default document root is the current working directory
- the default index file is configured as `README.md`
- the `/redex` route is configured to serve the state of the Redex instance


## Learn more

Other web server examples:
- https://github.com/evanx/redex/tree/master/config/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/