const http = require('http');
const url =  require('url');
const path = require('path');
const fs = require('fs');
const store = require('./db');
const ws = require('ws');

URL = url.URL;

let socketmap = {};
let socketkey = 0;

function wssend(data) {
    for(let websocket of Object.values(socketmap)) {
        websocket.send(data);
    }
}

const server = http.createServer(listener);
port = 3000;
wsport = port + 1;
wspath = "/live";

store.init().then(() => {
    console.log("Server on http://localhost:" + port + " ...");
    console.log("Websocket on ws://localhost:" + wsport + wspath + " ...");
    server.listen(port);
});

basePath = path.join(path.dirname(path.dirname(__filename)))


function browserGet(url, res) {

    let content;
    let file;

    if (url.pathname == "/") {
        file = path.join(basePath, "index.html");
    } else {
        file = path.join(basePath, url.pathname);
    }

    try {
        content = fs.readFileSync(file).toString();
    } catch (ex) {
        console.log(ex)
        res.writeHead(404);
        res.end();
        return Promise.resolve(404);
    }

    res.writeHead(200);
    res.end(content);
    return Promise.resolve(200);
}

const websocket = new ws.Server({
    host: "localhost",
    path: "/live",
    port: wsport
});

websocket.on("connection", (socket) => {
    socketmap[++socketkey] = socket;
    wssend(JSON.stringify({ type: "hello" }));

    socket.onclose = () => {
        delete socketmap[socketkey];
    };
});


const rest = {
    "post": {
        "/api/newsession": (url, data, res) => {
            if(data.name) {
                config = {
                    name: data.name
                };
                store.createSession(config.name).then(doc => {
                    res.writeHead(200);
                    res.end(doc['sessionid'].toString());


                    const update = {
                        type: "session",
                        data: doc
                    }

                    wssend(JSON.stringify(update));
                }, err => {
                    res.writeHead(500);
                    res.end(err.toString());
                });
            }
            else {
                res.writeHead(400);
                res.end();
            }
        },
        "/api/pushdata": (url, data, res) => {
            config = {
                data: data.data,
                timestamp: data.timestamp
            };

            const update = {
                type: "update",
                data: data
            }

            store.pushData(data.sessionid, config).then(doc => {
                res.writeHead(200);
                wssend(JSON.stringify(update));
                res.end();
            }, err => {
                res.writeHead(500);
                res.end(err.toString());
            });
        },
        "/api/updateassessment": (url, data, res) => {
            store.updateAssessment(data.sessionid, data.assessment).then(doc => {
                res.writeHead(200);
                res.end();
            }, err => {
                res.writeHead(500);
                res.end(err.toString());
            });
        },
        "/api/endsession": (url, data, res) => {
            store.endSession(data.sessionid).then(doc => {
                res.writeHead(200);

                const update = {
                    type: "session",
                    data: doc
                }

                wssend(JSON.stringify(update));
                res.end(JSON.stringify(update))
            }, err => {
                res.writeHead(500);
                res.end(err.toString());
            });
        }

    },
    "get": {
        "/": browserGet,
        "/scripts": browserGet,
        "/api/getsessions": (url, res) => {
            getReply(Promise.all([store.getOngoingSessions(), store.getPastSessions()]), res);
        },
        "/api/getsessiondata": (url, res, query) => {
            getReply(store.getSessionData(query.id), res);
        },
        "/api/getsessionassessment": (url,res, query) => {
            getReply(store.getAssessmentData(query.id), res);
        },
        "/api/getsession": (url, res, query) => {
            getReply(store.getSession(query.id), res);
        }
    }
};

function getReply(promise, res) {
    promise.then((docs) => {
        res.writeHead(200);
        res.end(JSON.stringify(docs));
    }, err => {
        res.writeHead(500);
        res.end();
    });
} 

methodPatternMap = new Object();
methodPatternMap.post = Object.keys(rest.post);
methodPatternMap.get = Object.keys(rest.get);


function getUrlResolver(method, pathname, map) {
    const paths = map[method];
    let match = null;
    if (paths) {
        for (let i = 0; i < paths.length; i++) {
            if (pathname.startsWith(paths[i]) && (match == null || paths[i].length > match.length)) {
                match = paths[i];
            }
        }
    }

    return match;
}

function listener(req, res) {
    const url = new URL(req.url, "protocol://host");

    resolver = getUrlResolver(req.method.toLowerCase(), url.pathname, methodPatternMap);
    switch (req.method.toLowerCase()) {
        case "get":
            rest.get[resolver](url, res, Object.fromEntries(url.searchParams.entries()));
            break;
        case "post":
            body = [];

            req.on("error", (err) => {
                console.error(err);
            }).on("data", (chunk) => {
                body.push(chunk);
            }).on("end", () => {
                body = Buffer.concat(body).toString();

                let data = null;

                try {
                    data = JSON.parse(body);
                } catch (e) {
                    res.writeHead(400);
                    res.end();
                }

                if (data) {
                    rest.post[resolver](url, data, res);
                }

            });
            break;
        default:
            res.writeHead(405);
            res.end();
    }
}
