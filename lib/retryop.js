const {of, interval, from, throwError, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer} = require('rxjs')
const {expand, take, map, takeUntil, takeWhile, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll}  = require('rxjs/operators')

const retryOp = ({ttl = 1000, maxRetries = 5})=>{

    // let retryCfg = { delay: c.ttl || cfg.ttl }
    // if(cfg.retries) retryCfg.count = cfg.retries
    // if(c.retries) retryCfg.count = c.retries

    return pipe(
        retryWhen((err)=>{
            return err.pipe(
                tap(()=>{ 
                    console.log('failure!')
                }),
                delay(ttl)
            )
        }),    
    )
}

module.exports = retryOp