const {Subject, of, AsyncSubject, interval, forkJoin, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge} = require('rxjs')
const { ajax } = require('rxjs/ajax')
const {expand, take, concat, takeWhile, mergeMap, map, concatAll, mergeAll, skip, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, catchError}  = require('rxjs/operators')
const fs = require('fs');
global.XMLHttpRequest = require('xhr2');
// const fam3list = fs.readFileSync('./example/famfamfam.txt').toString().split("\n")

/*
const fam3Stream = from(fam3list)
.pipe(
    mergeMap((v)=>
        ajax({
            url: `https://assets.scu.edu/images/icon/${v}`,
            method: 'GET',
            responseType: 'buffer'
        })
    ),
    map((v)=>v.response),
    tap((a)=>console.log(a)),
    take(fam3list.length)
)
*/

// fam3Stream
// .subscribe((v)=>{
//     console.log(v)
// })


const commentStream = interval(1000)
.pipe(
    skip(1),
    // tap(v=>{console.log('v: ' + v)}),
    mergeMap((v)=>{
        return ajax({
            url: `https://jsonplaceholder.typicode.com/posts/${v}/comments`,
            method: 'GET'
        })
    }),
    map((v)=>{
        if(!v.response){
            throw new Error('value expected!')
        }
        return v.response
    }),
    map((v)=>{
        v.ts = Date.now()
        return v
    }),
    take(99)
)

const photoStream = interval(1000)
.pipe(
    skip(1),
    mergeMap((v)=>{
        return ajax({
            url: `https://jsonplaceholder.typicode.com/photos/${v}`,
            method: 'GET'
        })
    }),
    map((v)=>{
        if(!v.response){
            throw new Error('value expected!')
        }
        return v.response
    }),
    map((v)=>{
        v.ts = Date.now()
        return v
    }),
    take(99)

)

const photoBlobStream = photoStream
.pipe(
    mergeMap((v)=>{
        // console.log(v)
        return from([ajax({
            url: v.url,
            method: 'GET',
            responseType: 'buffer'
        }),
        ajax({
            url: v.thumbnailUrl,
            method: 'GET',
            responseType: 'buffer'
        })
        ])
    }),

    concatAll(),
    // concatAll(),
    // tap(v=>{console.log(v)}),
    takeWhile(val => {
        console.log(val)
        return Buffer.isBuffer(val)
    }),
)

const userStream = interval(1000)
.pipe(
    skip(1),
    take(10),
    mergeMap((v)=>{
        return ajax({
            url: `https://jsonplaceholder.typicode.com/users/${v}`,
            method: 'GET'
        })
    }),
    concatAll(),
    map((v)=>{
        if(!v.response){
            throw new Error('value expected!')
        }
        return v.response
    }),
    catchError(err=>of()),
    map((v)=>{
        return {
            data: v,
            ts: Date.now()
        }
    }),

    // tap((v)=>console.log(v)),
    // map((v)=>v.response),
)

// userStream.subscribe((v)=>{
//     console.log(v)
// })
/*
const example = merge(
    from([0,1,2,3,4]),
    from([5,6,7,8,9]),
    from([10,11,12,13,14]),
  );
  
  const subscribe = example.subscribe(val => console.log(val));
*/

// allJSONStream = merge(photoStream, commentStream)
allJSONStream = merge(photoStream, commentStream, userStream)
allBlobStream = merge(photoBlobStream)
allStream = merge(allJSONStream, allBlobStream)

module.exports = {
    commentStream,
    photoStream,
    photoBlobStream,
    userStream,

    // TODO: need to make these work
    allBlobStream,
    allJSONStream,
    allStream
}