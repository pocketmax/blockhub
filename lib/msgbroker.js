const {of, interval, from, throwError, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer} = require('rxjs')
const {expand, take, map, takeUntil, takeWhile, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll}  = require('rxjs/operators')
const { isRoot, isTail, testRoot, testTail } = require('../lib/blockutils')
// const retryOp = require('../lib/retryop')
const driverFactory = require('./driver')

/**
* Store that represents a block or asset store
* @param {string} url connect string to store
* @param {number} ttl default ttl
*/


/**
 * 
 * @param {foo} csdf required
 * @param {cfg} csdf 
 * @returns 
 */
const MsgBroker = function(initCfg){
    if(!initCfg) throw new Error('no cfg object')
    if(Object.keys(initCfg).length === 0) throw new Error('no keys in arg object')

    const driver = driverFactory({url: initCfg.url})

    this.setQueue = ({queue})=>{
        let attempts=0
        return defer(()=>driver.setQueue(c))
        .pipe(
            // retryOp(),
            tap(()=>{
                attempts=0
            }),
            map((v)=>{
                return {
                }
            }),
            take(1)
        )
    }

    this.getQueueInfo = ({queue})=>{
        let attempts=0
        return defer(()=>driver.getQueueInfo({queue}))
        .pipe(
            // retryOp(),
            tap(()=>{
                attempts=0
            }),
            map((v)=>{
                // console.log('v......')
                // console.log(v)
                return v
                // return {
                //     action: 'get',
                //     // attempts,
                //     isReplaced: true,
                //     key: c.key,
                //     // length: c.blob.length,
                //     ts: Date.now()
                // }
            }),
            take(1)
        )
    }

    // TODO: only return msgs or error for no msg
    // TODO: retry loop
    this.pop = ({queue})=>{
        return defer(()=>driver.pop({queue}))
        .pipe(
            tap(()=>{
//                console.log('msg')
            }),
            map((v)=>{
                if(v === false) throw new Error('got false!')
                return v
            }),
            // retry({delay: 1000}),
            retryWhen((err)=>{
                return err
                .pipe(
                    tap(()=>console.log('msg pop = false')),
                    delay(2000)
                )
            }),
            // take(1)
        )        
    }
    this.ack = (c)=>{
        return defer(()=>driver.ack(c))
        .pipe(
            tap(()=>{
                console.log('ACT!@#!@#!@#!@#!@#!@#!@#!@#')
                attempts=0
            }),
            map((v)=>{
                return v
            }),
            take(1)
        )
    }
    this.nack = (c)=>{
        return defer(()=>driver.nack(c))
        .pipe(
            tap(()=>{
                console.log('NACK!@#!@#!@#!@#!@#!@#!@#!@#')
                attempts=0
            }),
            map((v)=>{
                return v
            }),
            take(1)
        )
    }

    this.reject = (c)=>{
        return defer(()=>driver.reject(c))
        .pipe(
            tap(()=>{
                console.log('REJECT!@#!@#!@#!@#!@#!@#!@#!@#')
                attempts=0
            }),
            map((v)=>{
                return v
            }),
            take(1)
        )
    }

    this.ackAll = ({msgs})=>{
        return defer(()=>driver.ackAll({msgs}))
        .pipe(
            tap(()=>{
                attempts=0
            }),
            map((v)=>{
                return v
            }),
            take(1)
        )          
    }

    this.append = ({queue, msg})=>{

        return defer(()=>driver.append({queue, msg}))
        .pipe(
            // retryOp(),
            tap(()=>{
                attempts=0
            }),
            map((v)=>{
                // console.log('msgbroker.append')
                // console.log(v)
                return {
                    // action: 'delete',
                    // // attempts,
                    // key: c.id,
                    // length: c.blob.length,
                    // ts: Date.now()
                }
            }),
            take(1)
        )
    }

}
module.exports = MsgBroker