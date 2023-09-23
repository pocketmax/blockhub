'use strict';
// example walker
const {Subject, of, pipe, AsyncSubject, interval, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge, forkJoin, combineLatest} = require('rxjs')
const {filter, bufferTime, combineAll, expand, take, map, concatAll, skip, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, catchError, mergeMap}  = require('rxjs/operators')
const { ajax } = require('rxjs/ajax')
global.XMLHttpRequest = require('xhr2');

// walk blocks, no asset store activity
const Walker = require('../../lib/walker')
const Store = require('../../lib/store')
let aStore = new Store({
    url: 'http://minio:g3d2g5fh43@143.110.150.190:9000/myblocks', 
    isJSON: false, 
    ext: 'blob'
})

let myWalk = new Walker({
    store:'http://minio:g3d2g5fh43@143.110.150.190:9000/myblocks', 
    // chain:'e82de5b2b56297fd04e7cfe02f150a2b'
    chain:'dc368ba6665b03893894e58531a4a499'
})

// refactor early exit logic info pipe
// DONE can cancel walk (early exit)
// can parse asset
// can sum parsed values (see if something already exists)
// can tie to other walk execs

// get a tail block
myWalk.getTail({})
.subscribe({
    complete:()=>{
        console.log('COMPLETE: ============== get a tail block =============')
    },
    next:(v)=>{
        console.log('NEXT:     ============== get a tail block =============')
        // console.log(v)
    }
})

// stream blocks to tail - early stop
/*
let mySub = myWalk.toLive({
    startId:'e82de5b2b56297fd04e7cfe02f150a2b'
})
.subscribe({
    complete:()=>{
        console.log('COMPLETE: ============== stream blocks to tail - early stop =============')
    },
    error:()=>{
        console.log('ERROR:    ============== stream blocks to tail - early stop =============')
    },
    next:(v)=>{
        // console.log(v.id)
        if(v.id === '4ca49c95042363842833bea83e041f33'){
            console.log('NEXT:     ====(early exit)=== stream blocks to tail - early stop =============')
            mySub.unsubscribe()
        } else {
            console.log('NEXT:     ============== stream blocks to tail - early stop =============')

        }
    }
})
*/
// walk and resolve assets
let stagedAssetsStreams = new Subject()
.pipe(
    concatMap(({idx, block, blob})=>{   // ordered
    // concatMap(({idx, block, blob})=>{    // unordered
        return blob
        .pipe(
            catchError((err)=>{
                return of(null)
            }),
            map((b)=>{
                return {idx, block, blob: b}
            })
        )
    }),
)

// where parsing the blobs happens
stagedAssetsStreams
.pipe(
    filter(blob=>blob!==null),
    // parse json
    map((v)=>{
        return v
    })
)
.subscribe((v)=>{
   console.log(v)
})

let myBlockSub2 = myWalk.toTail({})
.subscribe({
    complete:()=>{
        console.log('COMPLETE: ============== walk and resolve assets! =============')
    },
    next:b=>{
        // console.log('NEXT: ============== walk and resolve assets! =============')
        // console.log(b)
        for(let i in b.assets){
            i = Number(i)
            stagedAssetsStreams.next({
                idx: i,
                block: b,
                // blob: of('testing')
                blob: aStore.get({key: b.assets[i], retry: 2, ttl: 800})
            })
        }
    }
})


/*
// walk to live and emit blocks and emit onTail event
myWalk.toLive({
    onTail: (v)=>{
        console.log('ONTAIL: =========== found tail! =========')
        // TODO: infinite loops
        console.log(v)
        console.log('^ONTAIL: ========== found tail! ========^')
    }
})
.subscribe({
    complete:()=>{
        console.log('COMPLETE: ============== walk to live and emit blocks and emit onTail event! =============')
    },
    next:v=>{
        console.log('NEXT: ============== walk to live and emit blocks and emit onTail event! =============')
        console.log(v)
    }
})

// walk to live and unsub on specific block
let mySub = myWalk.toLive({})
.subscribe({
    complete:()=>{
        console.log('COMPLETE: ============== walk to live and unsub on specific block! =============')
    },
    next:v=>{
        console.log('NEXT: ============== walk to live and unsub on specific block! =============')
        console.log(v)

        if(v.height === 191){
            console.log('unsubscribe now!')
            mySub.unsubscribe()
        }
    }
})




let myAssetSub2 = assets.subscribe({
    complete:()=>{
    },
    next:({idx, block, blob})=>{

        let payload = blob.toString()
        if( /foobar/.test(payload)){
            mySub2.unsubscribe()
        }

    }
})
mySub2.add(myAssetSub2)
*/
// walk to tail and end on tail. completes
/*
myWalk.toTail({})
.subscribe({
    complete:()=>{
        console.log('completed!')
    },
    next:v=>{
        console.log(v)
    }
})
*/
// walk to live and emit blocks - defaults
// myWalk.toLive({})
// .subscribe(v=>console.log(v))

// walk to live and emit blocks - custom start block ID
// myWalk.toLive({startId: 'affe7afa80581b4e85b1bdfad90ed30d'})
// .subscribe(v=>console.log(v))


/*

// simple walker config with 1 block store and default chain
let myWalk2 = new Walker({store: blockStore, chain:'asdfwerwer'})


let blockStore = new Store({url:['asdf.com'], isJson: true})
let assetStore = new Store({url:['asdf.com']})

// simple walker config with 2 block stores and default chain
let myWalkDualStores = new Walker({store:['myurl.com'], chain:'asdfwerwer'})

// get tail block
// emits tail block/completes
myWalk.getTail()
.subscribe()

// walk to tail
// starts from root, emits blocks, on tail completes
myWalk.toTail()
.subsribe()

// from root to live
// starts from root and keep walking, no complete
myWalk.toLive()
.subsribe()

// from root to live
// starts from root and keep walking, no complete
// stop on certain block
let mysub = myWalk.toLive()
.pipe(
    tap((v)=>{
        if(v.id === 'adfadsfasdf'){
            mysub.unsubscribe()
        }
    })
)
.subsribe()

// from root to live
// starts from root and keep walking, no complete
// fetch assets for blocks and return assets in order


myWalk.toLive()
.pipe(
    tap((v)=>{
        for(let id of v.assets){
            assetStore.next(id)
        }
    })
)
.subsribe()

// from root to live
// fire event on tail
myWalk.toLive({onTail: (v)=>{}})
.subsribe()
*/