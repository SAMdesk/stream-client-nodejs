Stream client library for NodeJS.

## How to use

`npm install --save @socialgist/stream-client`

You need to create new instance of `Client` which you can configure by passing connection object to its constructor.

`Client` implements readable stream, so it can be piped or it can be consumed by listening to `data` events.

`Client` will automatically reconnect if connection is lost. If there is an error during connection to streaming API endpoint or connection gets closed, `Client` will emit `error` event. You must listen to these events but you don't have to act on them.

### Example
```js
const streaming = require('@socialgist/stream-client')

const client = new streaming.Client({
    username: "test",
    password: "123",
    customerName: "source1",
    dataSource: "stream1",
    streamName: "myname",
});
client.start();
client.pipe(process.stdout);
client.on('error', (e) => console.error(e));
```
