# SimpleBCTT

## Installation


Install [node v14](https://nodejs.org/en/).<br/>
Install the node packages with `npm install`.


### Run server
Run server with `node ./scripts/server.js`. Server will be hosted on `http://localhost:3000`.

## API Reference

| Method | Path              | Data  | Response | Description |
| -------| ----------------- | ----- | ---------| ----------- |
| POST   | /api/newsession | <pre>{<br>&nbsp;&nbsp;name: &lt;patient name&gt;<br>}</pre> | Session ID | Create a new BCTT session. |
| POST   | /api/endsession | <pre>{<br>&nbsp;&nbsp;sessionid: &lt;session id&gt;<br>}</pre> | - | End BCTT session. |
| POST   | /api/pushdata | <pre>{<br>&nbsp;&nbsp;data: [&lt;heart rate&gt;]<br>&nbsp;&nbsp;timestamp: [&lt;utc timestamp&gt;]<br>}</pre> | - | Push heart rate data. `data` and `timestamp` parameters expect json arrays of respective data. |

