const fs = require("fs");
const path = require("path");

const DVR = require("./dvr.js")

const config_path = path.join(__dirname, process.argv[2] ? process.argv[2] : "config.json")

var config = {}
if(fs.existsSync(config_path)){
    try{
        config = JSON.parse(fs.readFileSync(config_path))
    } catch(err){
        console.log("Error parsing configuration file.", err)
    }
} else {
    console.log("No configuration file provided.")
}

new DVR({...config}).downloadRecordings(() => {
    console.log("Pull complete. Exiting.")
});