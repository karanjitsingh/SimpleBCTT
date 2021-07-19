var path =  require('path');
var fs = require('fs');
var Datastore = require('nedb');

dir = path.dirname(__filename);
sessionPath = path.join(dir, './data/session.db');
dataPath = path.join(dir, './data/data.db');

store = {}

function initdb(db) {
    return new Promise((resolve, reject) => {
        db.loadDatabase((err) => {
            if(err) {
                reject();
            }
            else {
                db.ensureIndex({ fieldName: 'sessionid' }, () => {
                    resolve();
                });
            }
        });
    });
}

function init() {
    store.sessions = new Datastore({ filename: sessionPath });
    store.data = new Datastore({ filename: dataPath });
    return Promise.all([initdb(store.sessions), initdb(store.data)]);
}

function getSessionCount(name) {
    return new Promise((resolve, reject) => {
        store.sessions.count({}, (err, count) => {
            if (err) {
                console.log("Db Session Count Error:" + err);
                reject(err);
            }
            else
                store.sessions.count({ 'name':  name }, (err, pcount) => {
                    if (err) {
                        console.log("Db Session Count Error:" + err);
                        reject(err);
                    }
                    else
                        resolve([count, pcount]);
                });
        });
    })
}

function insert(db, data) {
    return new Promise((resolve, reject) => {
        db.insert(data, (err, doc) => {
            if(err) {
                console.log("DB Insert Error: " + err);
                reject(err)
            }
            else
                resolve(doc);
        })
    })
}

function find(db, query) {
    return new Promise((resolve, reject) => {
        db.insert(query, (err, doc) => {
            if(err) {
                console.log("DB Insert Error: " + err);
                reject(err)
            }
            else
                resolve(doc);
        })
    })
}

function update(db, query, data, options = {}) {
    return new Promise((resolve, reject) => {
        db.update(query, data, options, (err, num, doc) => {
            if(err) {
                console.log("DB Update Error: " + err);
                reject(err)
            }
            else
                resolve(doc);
        })
    });
}

function find(db, query, sort = null) {
    return new Promise((resolve, reject) => {
        callback = (err, doc) => {
            if(err) {
                console.log("DB Query Error: " + err);
                reject(err)
            }
            else
                resolve(doc);
        };

        if(sort)
            db.find(query).sort(sort).exec(callback);
        if(!sort)
            db.find(query, callback);

    });
}

function createSession(name) {
    name = name.toLowerCase();

    return getSessionCount(name).then((([count, pcount]) => {
        const time = Date.now();
        return insert(store.sessions, {
            'sessionid': count + 1,
            'name': name,
            'start_time': time,
            'state': 'running',
            'end_time': null,
            'sessionnumber': pcount + 1,
            'last_update': time
        }).then((doc) => {
            return insert(store.data, {
                'sessionid': count + 1,
                'assessment': [],
                'data': [],
                'timestamp': []
            }).then( () => {
                return Promise.resolve(doc);
            });
        })
    }))
}

function getOngoingSessions() {
    return find(store.sessions, {
        'state': 'running'
    }, {'start_time': -1});
}

function getPastSessions() {
    return find(store.sessions, {
        'state': 'done'
    }, {'start_time': -1});
}

function getAllSessions() {
    return find(store.sessions, {}, {'start_time': -1});
}

function getSession(id) {
    return find(store.sessions, { 'sessionid': parseInt(id) });
}

function getSessionsForPatient(name) {
    name = name.toLowerCase();
    return find(store.sessions, {
        'name': name
    }, {'start_time': -1});
}

function endSession(sessionid) {
    return update(store.sessions, { 'sessionid': parseInt(sessionid) }, {
        $set: {'state': 'done', "end_time": Date.now()}
    }, {
        returnUpdatedDocs: true
    }).then((doc) => {
        return updateTimestamp(sessionid).then( () => {
            return Promise.resolve(doc);
        });
    });
};

function pushSessionData(sessionid, data) {
    return update(store.data, { 'sessionid': parseInt(sessionid) }, {
        $push: {
            'data': { $each: data.data },
            'timestamp': { $each : data.timestamp }
        }
    }, {
        returnUpdatedDocs: true,
    }).then((doc) => {
        return updateTimestamp(sessionid).then( () => {
            return Promise.resolve(doc);
        });
    });
}

function updateAssessment(sessionid, data) {
    return update(store.data, { 'sessionid': parseInt(sessionid) }, {
        $set: {
            'assessment': data,
        }
    }).then(() => {
        return updateTimestamp(sessionid);
    });
}

function updateTimestamp(sessionid) {
    const time = Date.now();

    return update(store.sessions, { 'sessionid': parseInt(sessionid) }, {
        $set: {
            last_update: time
        }
    });
}

function getSessionData(sessionid) {
    return find(store.data, { 'sessionid': parseInt(sessionid) }).then(doc => {
        return {
            data: doc[0].data,
            timestamp: doc[0].timestamp
        }
    });
}

function getAssessmentData(sessionid) {
    return find(store.data, { 'sessionid': parseInt(sessionid) }).then(doc => {
        return {
            assessment: doc[0].assessment
        }
    });
}



exports.init = init;
exports.createSession = createSession;
exports.getOngoingSessions = getOngoingSessions;
exports.getPastSessions = getPastSessions;
exports.getSessionsForPatient = getSessionsForPatient;
exports.endSession = endSession;
exports.getAllSessions = getAllSessions;
exports.getSession = getSession;
exports.pushSessionData = pushSessionData;
exports.updateAssessment = updateAssessment;
exports.getSessionData = getSessionData;
exports.getAssessmentData = getAssessmentData;
exports.pushData = pushSessionData;

exports.store = store;

exports.reset = () => {
    fs.rmSync(sessionPath);
    fs.rmSync(dataPath);
    return init()
}



