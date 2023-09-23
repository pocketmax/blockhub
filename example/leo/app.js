'use strict';
// example emitter: sends blobs to asset store and emits valid hashes to appender
// APPENDER_URL=http://127.0.0.1:8080/append ASSETSTORE_URL=http://minio:g3d2g5fh43@143.110.150.190:9000/myassets CHAIN=f2204332e83fa054bfe8265da940bfba nodemon example/leo/app.js
const fs = require('fs')
const _ = require('lodash')
const {Subject, of, AsyncSubject, interval, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge, forkJoin, combineLatest} = require('rxjs')
const {filter, bufferTime, combineAll, expand, take, map, concatAll, skip, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, catchError, mergeMap}  = require('rxjs/operators')
const { ajax } = require('rxjs/ajax')
global.XMLHttpRequest = require('xhr2');
const md5 = require('md5')
if(!process.env['APPENDER_URL']) throw 'APPENDER_URL required'
if(!process.env['ASSETSTORE_URL']) throw 'ASSETSTORE_URL required'
if(!process.env['CHAIN']) throw 'CHAIN required'
let Store = require('../../lib/store')
let BlobStream = (path)=>{
    return new Observable((sub)=>{
        let list = fs.readdirSync(path)
        list = _.shuffle(list)
        // console.log(list)
        for(let i of list){
            fs.promises.readFile(`${path}/${i}`)
            .then((buf)=>{
                sub.next(buf)
            })
        }        
    })    
}

let store = new Store({url: process.env['ASSETSTORE_URL'], isJSON: false, ext: 'asset'})

// stream of json blobs
let jsonBlobs = BlobStream('./example/blobs/pdf')

// stream of png blobs
let pngBlobs = BlobStream('./example/blobs/png')

// stream of mp3 blobs
let mp3Blobs = BlobStream('./example/blobs/mp3')

// stream of pdf blobs
let pdfBlobs = BlobStream('./example/blobs/pdf')

// stream of txt blobs
let txtBlobs = new Subject()

// blobs ready to be sent to asset store
let readyBlobs = merge(jsonBlobs, pngBlobs, pdfBlobs, mp3Blobs, txtBlobs)


// checksums ready to be sent to appender
let batchedChecksums = new Subject()
.pipe(
    bufferTime(5000,null,5),
    filter(v=>v.length>0)
)

// checksums to assets that don't exist
let deadChecksums = new Observable((sub)=>{
    for(let i = 0; i<=100;i++){
        sub.next(md5(`${Date.now()}${i}`))
    }
})

// invalid checksums
let invalidChecksums = deadChecksums
.pipe(
    map((v)=>v.replace(/\d/ig,''))
)

readyBlobs
.subscribe((v)=>{
    let hash = md5(v)
    // store.put({key:hash, val:v})
    // .subscribe((v)=>{
    //     // console.log('asset written...')
        batchedChecksums.next(hash)
    // })
})

// payloads ready to be sent to appender
let readyForAppend = new Subject()
.pipe(
    // tap((v)=>{
    //     console.log('readyForAppend!')
    //     console.log(v)
    // }),
    concatMap((v)=>ajax({
        url: process.env['APPENDER_URL'],
        // url: 'http://google.com',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: v
    })),
    retry(1500),
    map((v)=>{
       console.log('appender response....')
       console.log(v.status)
        if (v.status !== 201) {
            console.log('retrying....')
            throw({error: 'uh oh!'});
        }

    }),
    retryWhen((e)=>e.pipe(
        // TODO: also account for status!=201
        tap((v)=>{
            console.log('#####################')
            console.log('# failed to append checksum!')
            console.log('#####################')
        //    console.log(v)
        }),
        delay(1500)
    ))    
)

readyForAppend
.subscribe((v)=>{
    // console.log('readyForAppend sub...')
    // console.log(v)
})

batchedChecksums
.subscribe((batch)=>{
    // console.log('batchedChecksums...')
    // console.log(batch)
    let body = {
        chain: process.env['CHAIN'],
        checksums: batch
    }
    readyForAppend.next(body)
})
