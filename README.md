# alice.lib.dvr
Easily download all recordings on your TVHeadend server.
**Important: this is potentially buggy software, do not use in production!**

## Usage
See **app.js** for full example.

All recordings are **deleted** from TVHeadend after being downloaded.

### As a standalone app

```
node app.js config.json
```

Provide a custom configuration with your tvheadend user information. Not all parameters are required, if any of the fields are empty, then the default values below are used.

```json
{
    "protocol": "http:",
    "host": "localhost",
    "port": 9981,
    "user": "",
    "pass": "",
    "dvr_directory": "DVR"
}
```

### As a module

```javascript
//...
const DVR = require("./dvr.js")

// see config.json for an example obj
new DVR({...config}).downloadRecordings(() => {
    console.log("Pull complete. Exiting.")
});
// ...
```

## Methods

Downloads a list of all completed recordings and saves each one to ./DVR/{uuid}
```javascript
// fn: () => {// All downloads complete.}
downloadRecordings(fn)
```

## TODO:
Basically everything... Pull requests are welcome!

## License
MIT
