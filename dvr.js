/*
    dvr.js
*/

const http = require("http")
const https = require("https")
const fs = require("fs")
const path = require("path")

module.exports = function({protocol = "http:", host = "localhost", port = 9981, user, pass, dvr_directory = path.join(__dirname, "DVR")} = {}){

    this.downloadRecordings = function(fn){

        const auth = user && pass ? (user + ":" + pass + "@") : user ? user + "@" : "";

        if(!fs.existsSync(dvr_directory)){
            fs.mkdirSync(dvr_directory)
        }

        const base_url = protocol + "//" + auth + host + ":" + port;

        const httpx = protocol == "http:" ? http : https;

        const MAX_ENTRIES = 1000;

        var fn_get_recordings = (fn) => {
            const req = httpx.request(base_url + "/api/dvr/entry/grid_finished?limit=" + MAX_ENTRIES, (stream) => {
                if(stream.statusCode == 200){
                    let data = [];
                    stream.on("data", (chunk) => data.push(chunk))
                    stream.on("close", () => {
                        try{
                            const obj = JSON.parse(data.join(""));
                            fn(obj)
                        } catch(err) {
                            fn({error: err})
                        }
                    })

                } else {
                    fn({error: stream.statusCode})
                }
            })
            req.on("error", (err) => fn({error: err.code}))
            req.end()
        }

        var fn_pull_recordings = (fn) => {
            fn_get_recordings(obj => {

                if(obj.error){
                    return console.log(obj)
                }

                const total_recordings = obj.total;

                let recordings = obj.entries.filter(obj => obj.sched_status == "completed")
                
                recordings = recordings.sort((a, b) => {
                    var fn_file_length = (obj) => parseInt(obj.filesize)
                    return fn_file_length(a) - fn_file_length(b)
                })

                console.log(recordings.length, "of", total_recordings, "items to download")

                // console.log(obj);

                let i = 0;
                var fn_loop = () => {

                    const obj = recordings[i];

                    const {uuid} = obj;

                    console.log(i, uuid, "pull")

                    const output_directory = path.join(dvr_directory, uuid)
                    !fs.existsSync(output_directory) && fs.mkdirSync(output_directory)

                    const obj_path = path.join(output_directory, uuid + ".json")
                    const dvr_path = path.join(output_directory, "dvrfile.ts")

                    var start = 0;

                    if(fs.existsSync(dvr_path)){
                        
                        start = fs.statSync(dvr_path).size;
                    }

                    const write_config = {flags: "a"};

                    const dvr_write_stream = fs.createWriteStream(dvr_path, write_config)

                    const req = httpx.request(base_url + "/dvrfile/" + uuid, (stream) => {
                        
                        stream.pipe(dvr_write_stream);

                        const file_length = start + parseInt(stream.headers["content-length"])

                        let bytes = start;
                        stream.on("data", chunk => {
                            bytes = bytes + chunk.length;
                            process.stdout.clearLine();
                            process.stdout.cursorTo(0);
                            process.stdout.write( bytes + "/" + file_length + " " + Math.round(bytes / file_length * 100 * 100) / 100 + "%");
                        })

                        stream.on("close", () => {
                            process.stdout.clearLine();
                            process.stdout.cursorTo(0);
                            console.log(i, uuid, "downloaded")

                            fs.writeFileSync(obj_path, JSON.stringify(obj))

                            httpx.request(base_url + "/api/dvr/entry/remove?uuid=" + uuid, (stream) => {
                                console.log(i, uuid, "deleted from tvheadend")
                                if(i < recordings.length - 1){
                                    i = i + 1;
                                    fn_loop()
                                } else if(total_recordings > MAX_ENTRIES){
                                    console.log(total_recordings - MAX_ENTRIES, "items remaining, pulling...")
                                    fn_pull_recordings(fn)
                                } else fn(i)
                            }).end()
                            
                        })

                    })

                    req.setHeader("Range", "bytes=" + start)
                    req.on("error", (err) => console.log("Pull error:", err))
                    req.end()

                }

                if(recordings.length > 0){
                    fn_loop()
                } else {
                    fn(i)
                }
            })
        }

        fn_pull_recordings(() => {
            fn && fn()
        });

    }
}