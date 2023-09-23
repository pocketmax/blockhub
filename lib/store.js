const {of, interval, from, throwError, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer} = require('rxjs')
// import {of, interval, from, throwError, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, defer} from 'rxjs'
const {expand, filter, catchError, take, map, takeUntil, takeWhile, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll}  = require('rxjs/operators')
// import {expand, take, map, takeUntil, takeWhile, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll} from 'rxjs/operators'

const { isRoot, isTail, testRoot, testTail } = require('../lib/blockutils')
// const retryOp = require('../lib/retryop')
const _ = require('lodash')
// import * as _ from 'lodash'
const driverFactory = require('./driver')
// import * as driverFactory from './driver'
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
const Store = function(initCfg){
    if(!initCfg) throw new Error('no cfg object')
    if(!_.isBoolean(initCfg.isJSON)) throw new Error('isJSON not set')
    if(Object.keys(initCfg).length === 0) throw new Error('no keys in arg object')
    if(!initCfg.ext) throw new Error('ext not set')
    const driver = driverFactory({url: initCfg.url, isJSON: initCfg.isJSON})

    this.put=(c)=>{
        let attempts=0
        c.key = `${c.key}.${initCfg.ext}` 
        return defer(()=>driver.put(c))
        .pipe(
            // retryOp(),
            tap(()=>{
                attempts=0
            }),
            map((v)=>{
                // console.log('saves to store')
                return {
                    action: 'put',
                    // attempts,
                    isReplaced: true,
                    key: c.key,
                    length: c.val.length,
                    ts: Date.now()
                }
            }),
            take(1)
        )
    }

    // TODO: on timeout = fail
    // TODO: on retries out = fail
    // TODO: no timeout and no retries = infinite live
    this.get=(c)=>{
        let attempts=0
        c.key = `${c.key}.${initCfg.ext}`
        // return defer(()=>driver.get(c))
        return driver.get(c)
        .pipe(
            // tap((v)=>{ 
            //     console.log('v.v.v.v.v')
            //     console.log(v)
            // }),
            retry(10),
            // retryOp(),
            tap(()=>{
                attempts=0
            }),
            catchError((err)=>{
                // console.log('err...')
                // console.log(err)
                return of(null)
                // if(err.statusCode === 404 && err.code === 'NoSuchKey'){
                //     throw new Error('not found')
                // }
            }),
            filter(v=>v),
            map((v)=>{
                // console.log(v)
                if(initCfg.isJSON) return JSON.parse(v)
                return v
                // if(Buffer.isBuffer(v)){
                //     return ft.fileTypeFromBuffer(v);
                // } else {
                //     throw 'big super error!'
                // }

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

    this.delete=(c)=>{
        c.key = `${c.key}.${initCfg.ext}` 

        return defer(()=>driver.delete(c))
        .pipe(
            // retryOp(),
            tap(()=>{
                attempts=0
            }),
            map((v)=>{
                return {
                    action: 'delete',
                    // attempts,
                    key: c.id,
                    length: c.blob.length,
                    ts: Date.now()
                }
            }),
            take(1)
        )
    }

}
// export Store
// export default Store
module.exports = Store