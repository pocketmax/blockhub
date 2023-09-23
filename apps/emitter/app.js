'use strict';
const {Subject, of, AsyncSubject, interval, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge} = require('rxjs')
const { ajax } = require('rxjs/ajax')
const {expand, take, map, concatAll, skip, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, catchError}  = require('rxjs/operators')
const fs = require('fs')

// "--chain=6fc2298ab1b48b19ce599d6b05afed98",
// let blockCheck = require('./blockcheck')
// let blockLinkCheck = require('./blocklinkcheck')
global.XMLHttpRequest = require('xhr2');
const BlockStream = require('../lib/walker')
const Appender = require('../lib/appender')
const appenderStream = require('../lib/appenderstream')
const _ = require("lodash")
const md5 = require('md5')
const stubBlobs = require('../example/stubs').commentStream




const init = async ({walker = null, assetStore = null}) => {

    let appenderCfg = {
        chain: '6fc2298ab1b48b19ce599d6b05afed98', // DEFAULT - chain
        assetStore,
        auth: {},
        retries: 4, // DEFAULT - retry 4 times before failing
        ttl: 3000, // DEFAULT - each retry attempt is 3 seconds
    }
    if(walker) appenderCfg.walker = walker

    let myAppender = new Appender(appenderCfg)

    myAppender.append({
        blob: Buffer.from('testing123')
    })

    myAppender.append({
        blob: Buffer.from('testing123'),
        confirm: 'APPEND' // emit confirm to appender
    })

    myAppender.append({
        blob: Buffer.from('testing123'),
        chain: 'my override chain',
        confirm: 'CHAIN' // emit confirm to chain - throw error if blockstore not present
    })

    myAppender.append({
        blob: Buffer.from('testing123'),
        chain: 'my override chain'
    })

    myAppender
    .watch({
        error:(e)=>{
            console.log('something went wrong with the stream')
        },
        next:(v)=>{
            // confirm: APPEND or CHAIN
            // chainID
            // checksum
            // round trip time
            // status  success/fail - err msg
            console.log(v)  // confirmation the blob made it to the chain
        },
        complete:()=>{
            console.log('stream closed properly')
        }
    })

    myAppender
    .watch({
        error:(e)=>{
            console.log('something went wrong with the stream')
        },
        next:(v)=>{
            // confirm: APPEND or CHAIN
            // chainID - if confirm=CHAIN
            // blockID - if confirm=CHAIN
            // checksum
            // round trip time
            // status  success/fail - err msg
            console.log(v)  // confirmation the blob made it to the chain
        },
        complete:()=>{
            console.log('stream closed properly')
        }
    })

    myAppender.appendConfirm({blob: 'testing'})


    const argv = require('yargs')
    .scriptName('emitter')
    .usage('$0 <cmd> [args]')
    .option('chain',{
        description:'chain id to use',
        type: 'string',
        required: true
    }).argv
    console.log(argv)
    let pendingChecksums = {}

    stubBlobs.pipe(
        tap(v=>console.log(v)),
        map((v)=>{
            let id = md5(v)
            return assetStore.put({id, blob:v})
        }),
        concatAll(),
        map((v)=>{
            return {
                chain: argv.chain,
                ts: Date.now(),
                checksums: [v.id]
            }
        }),
        tap((body)=>{
            if(!blockStore) return false

            console.log(`caching checksum: ${body.checksums[0]}`)
            pendingChecksums[body.checksums[0]]=body.ts

        }),
        map((body)=>ajax({
            url: process.env['APPENDER_URL'],
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body
        })),
        concatAll(),
        retryWhen((e)=>e.pipe(
                tap((v)=>{
                    console.log('#####################')
                    console.log('# failed to append checksum!')
                    console.log('#####################')
                    console.log(v)
                }),
                delay(1500)
            )
        )

    )
    .subscribe((v)=>{
        console.log('success!')
        console.log(JSON.parse(v.request.body))
        
    })

    if(blockStore){
        console.log('block chain confirm enabled!')
        new BlockStream({blockStore})
        .walk({startAt: argv.chain})
        .subscribe((block)=>{
//            console.log(block)
            let a = Object.keys(pendingChecksums)
            let b = block.assets
            let c = _.intersection(a, b)
            for(let v of c){
                console.log('deleting ' + v)
                delete pendingChecksums[v]
            }
        }) 

        // garbage collection for checksum cache
        interval(5000).pipe(
            tap(()=>{
                for(let i in pendingChecksums){
                    const age = Date.now() - pendingChecksums[i]
                    if(age > 1000){
                        console.log(`stale checksum...`)
                        console.log(`cs: ${i}`)
                        console.log(`ts: ${pendingChecksums[i]}`)
                        console.log(`age: ${age}`)

                        /* TODO: re-send this to the appender
                        {
                            chain: argv.chain,
                            ts: Date.now(),
                            checksums: [i]
                        }
                        */
                    }
                }
    
            })

        )
    
    }
}
module.exports = init