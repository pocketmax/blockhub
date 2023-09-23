const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
// const cm = require('../lib/chainmap')
const MsgBroker = require('../../lib/msgbroker')
const Store = require('../../lib/store')
const Walker = require('../../lib/walker')
const { isSeed, isRoot, isTail, testRoot, testTail } = require('../../lib/blockutils')
const { of, interval, from, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer, combineLatest, Subject } = require('rxjs')
const { expand, take, zip, map, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last }  = require('rxjs/operators')
const md5 = require('md5')
const getMime = require('../../lib/getmime')
const mimeFilter = require('../../lib/mimefilter')
const ipFilter = require('../../lib/ipfilter')
const cacher = require('../../lib/cacher')
// TODO curl -X POST --data-binary "@/tmp/myfile.jpg" http://site
// TODO curl -X POST http://localhost:333/asdf -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJjaGFpbnMiOlsiY2hhaW4xIiwiZDE2YTI4NmM4ODFiZThiN2Y1ODQ2NTg3ZTNmODVhMzMiXX0.vZP6ihWcEEkVwppi4opRdzlxCNGmjd-S14C8-xwJOG8' -d '{"chain":"d16a286c881be8b7f5846587e3f85a33","assets":["016a286c881be8b7f5846587e3f85a33","016a286c881be8b7f5846587e3f85a33"]}'
// nodemon appender/app.js --queue=my_beta --broker=amqp://myrabbit:g3d2g5fh43@143.110.150.190:5672
const yargs = require('yargs')
.scriptName("appender")
.usage('$0 <cmd> [args]')

// --ip-allow=999.999.999.999
// --ip-allow=192.168.3.255/12
// --ip-allow=192.12-168.1-30.22
.option('ip-allow',{
    conflicts: 'ip-block',
    required: false,
    array: true,
})
.option('ip-block',{
    conflicts: 'ip-allow',
    required: false,
    array: true,
})

// --mime-allow=application/json
// --mime-allow=application/*
// --mime-allow=*/json
.option('mime-allow',{
    conflicts: 'mime-block',
    required: false,
    array: true,
})
.option('mime-block',{
    conflicts: 'mime-allow',
    required: false,
    array: true,
})

// --store=http://mystore.com
// --store=mystore.com
// --store=s3://mystore.com
.option('block-store',{
    description: 'block store to send blocks to',
    required: true,
    type: 'string',
})
.option('asset-store',{
    description: 'asset store to send blobs to',
    required: true,
    type: 'string',
})

.option('chain',{
    description: 'chain to walk to clear cache from',
    required: true,
    type: 'string',
})

// --broker=amqp://myhosta
.option('broker',{
    description: 'msg broker to send hashes to'
})

.option('queue',{
    required: true,
    type: 'string'
})

.option('cache',{
    description: 'path to local file to save/restore cache',
    required: false,
    type: 'string'
})

.option('dryrun',{
    description: 'just go through the motions',
    required: false,
    type: 'boolean'
})

.option('max-size',{
    description: 'max payload size',
    required: true,
    default: 5000000000,
    type: 'number'
})

const argv = yargs.argv;
console.log(argv)
let port = 8080
const broker = new MsgBroker({
    url: argv['broker']
})
const assetStore = new Store({
    url: argv['asset-store'], 
    ext: 'asset',
    isJSON: false
})
const blockStore = new Store({
    url: argv['block-store'], 
    ext: 'block',
    isJSON: true
})
const walker = new Walker({store: blockStore})
const server = Hapi.server({
    port: port || 80
});

server.route({
    config: {
        payload: {
            parse: false,
            maxBytes: argv['max-size']
        }        
    },
    method: 'POST',
    path: '/append',
    handler: function (request, h) {
        let mimeType = getMime(request.payload)
        if( (argv['mime-allow'] || argv['mime-block']) && !mimeFilter(mimeType, argv['mime-allow'], argv['mime-block']) ){
            return h.response(`content-type ${mimeType} blocked!`).code(400)
        }
        if( (argv['ip-allow'] || argv['ip-block']) && !ipFilter(request.info.remoteAddress, argv['ip-allow'], argv['ip-block']) ){
            return h.response(`content-type ${mimeType} blocked!`).code(400)
        }
        const hash = md5(request.payload)
        const blob = request.payload
        // console.log('got it...!')
        // console.log(request.info.remoteAddress)
        // console.log(request.headers)
        // console.log(request.url)
        // console.log(request.params)
        // console.log(request.query)
        // console.log(request.payload)
        // console.log(request)

        return new Promise((resolve, reject)=>{
            assetStore.put({key: hash, val: blob})
            .subscribe(()=>{
                broker.append({
                    queue: argv['queue'],
                    msg: Buffer.from(hash)
                })
                .subscribe(()=>{
                    // cache hash since its on it's way to be added to the chain
                    cacher.add({key:hash})
                    resolve(h.response('success!').code(201))
                })
            })
    
        })

    }
});

cacher.load()
.subscribe({complete:()=>{
    console.log('cache loaded!')

    console.log('walking to tail...')
    let onTail = ()=>{
        console.log('walking to tail...DONE!')
        server.start()
        console.log('Server running on %s', server.info.uri);
    }
    walker.toLive({
        startId: argv['chain'],
        onTail
    })
    .subscribe((block)=>{
        for(let a of block.assets){
            cacher.delete(a)
        }
    })
    
    // emit hashes that are too old
    cacher.stale({date: Date.now() - 1000})
    .subscribe((hash)=>{
        // and try to append them
        broker.append({queue: argv['queue'], msg: Buffer.from(hash)})
    })
}})

process.on('exit', ()=>{
    if(argv['cache']){
        console.log('dump current cache!')
        cacher.dump({src: argv['cache']})
        .subscribe({complete:()=>{
            // file is done being dumped
        }})
    }
})

