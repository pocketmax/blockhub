'use strict';
const {Subject, of, AsyncSubject, interval, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge} = require('rxjs')
const { ajax } = require('rxjs/ajax')
const {expand, take, map, concatAll, skip, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, bufferTime, catchError, filter}  = require('rxjs/operators')
const AssetFact = require('../../stores/assetfactory')
const BlockFact = require('../../stores/blockfactory')
const md5 = require('md5')
const yargs = require('yargs')
.scriptName('exampledon')
.usage('$0 <cmd> [args]')
.option('appender',{
    description:'appender url',
    type: 'string',
    required: true
})
.option('chain',{
    description:'chain to use',
    type: 'string'
})
.option('limit',{
    description:'max checksums for an asset',
    type: 'number',
    default: 5
})
const argv = yargs.argv;
console.log('exampledon started!')
console.log(argv)
const myStub = require('../stubs').commentStream
// const appenderStream = require('../../lib/appenderstream');
const assetStore = AssetFact({url: argv['asset-store']})
const appendStream = new Subject().pipe(
    bufferTime(5000,null,argv.limit),
    filter(v=>v.length!==0),
    concatMap((checksums) => {
        const cfg = {
            url: argv.appender,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body:{
                checksums,
                chain: argv.chain
            }
        }
        return ajax(cfg)
        .pipe(
            catchError(v=>{
                console.log('appender POST: failed!')
                if(!v.response) {
                    console.error('connect failure!')
                } else if(v.response.status!==201) {
                        console.error('failed to create!')
                } else {
                    console.error('UNKNOWN ERROR!')
                }
            }),
            retry({delay: 1000})
        )
    }),    
)

appendStream.subscribe(()=>{
    console.log('payload appended')
})

assetStore.connect()
.subscribe((a)=>{
    console.log('asset store connected!')

    myStub
    .subscribe((v)=>{
        // console.log('====================')
        // console.log('1. incomming blob...')
        const blob = Buffer.from(JSON.stringify(v))
        let checksum = md5(blob)
        assetStore.put({
            id: checksum, 
            blob: blob
        })
        .subscribe((a)=>{
            // console.log(a)
            console.log('blob uploaded to asset store')
            // cache checksum
            appendStream.next(checksum)
        })
    
    })
    
})

