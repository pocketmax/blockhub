const {Subject, throwError, iif, of, pipe, AsyncSubject, interval, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge, combineLatest} = require('rxjs')
const {expand, takeLast, take, first, filter, takeUntil, map, concatAll, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, catchError}  = require('rxjs/operators')
let Store = require('./store')
// let blockCheck = require('./blockcheck')
// let blockLinkCheck = require('./blocklinkcheckfwd')
// let blockLinkCheckFwd = require('./blocklinkcheckfwd')
// let blockLinkCheckBck = require('./blocklinkcheckbck')

/*
WARM TAIL: tail found but continue to wait for next block
COLD TAIL: tail found and stop walk
*/


// TODO: routine to wait/test the tail block
// map((block)=>{
    // monitor block for next field for a time. 
    // if next field, exit (another builder is building for this chain)
    // return block
// }),

const Walker = function(cfg){
    if(!cfg.store) {
       console.log('Walker init missing store')
        process.exit()
    }
    let store
    if(typeof cfg.store === 'string'){
        store = new Store({url: cfg.store, isJSON: true, ext: 'block'})
    } else {
        store = cfg.store
    }

    isColdTail = ()=>{

    }

    // this.getBlockStore = ()=>{
    //     return cfg.blockStore        
    // }

    const verifyLink = ({enable = true,fwd = true})=>{
        if(enable){
            return pipe(
                pairwise(),
                map(blockLinkCheck),
                map((x)=>x[1]),
                map(blockCheck),
            )
        }
        return pipe()
    }

    // emits all blocks except tail block
    // emits extra key to indicate block before tail block
    // no complete
    // when tail block detected, emit value to another observable
    this.toLive = ({
        startId = cfg.chain,    // optional block ID to start at, defaults to chain ID
        stopId = null,
        maxAttempts = null, 
        onTail = null,
        warmTailTrigger = null, // block with missing next field
        coldTailTrigger = null, // block with missing next field after multiple retries
        verify = false
        })=>{
        
        let tailFired = false
        const retryCfg = { delay: 1000}
        if(maxAttempts) retryCfg.count = maxAttempts
        if(!startId) throw 'Walker.toLive: startId required'
        return store.get({key: startId})
        .pipe(
            // tail check
            tap((x)=>{
            }),
            expand((x) => {
                if(!tailFired && !x.next && onTail) {
                    onTail(x)
                    tailFired = true
                }
                return store.get({
                    // key: (x.next) ? x.next : x.id
                    key: x.next
                })
                .pipe(
                    tap(v=>{
                        if(stopId && stopId === v.id) throw v
                    }),
                    catchError(v=>{
                        return of(v)
                    }),
                   retry(retryCfg),
                )
            }),
//            verifyLink({enable: verify}),
        )
    }

    // emits all blocks and stops on tail[next][complete]
    this.toTail = ({
        startId, 
        stopId = null,
        maxAttempts=0,
        verify = false,
        })=>{

        return this.toLive({startId, stopId, maxAttempts, verify})
        .pipe(
            tap(v=>{
                // tail block found
                // console.log(v)
                if(!v.next) throw v
                // return v
            }),
            // catch the warm tail and return it as the hard tail
            catchError(v=>{
                // console.log('testing123')
                return of(v)
            }),
            // takeLast(1)
        )

    }

    // emits tail block[1 next][complete]
    this.getTail = ({
        startId, 
        maxAttempts = 3,
        verify = false,
        })=>{
        return this.toTail({startId, verify})
        .pipe(
            takeLast(1)
        )
    }

}
// export default Walker
module.exports = Walker