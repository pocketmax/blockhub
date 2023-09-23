const {of, interval, from, throwError, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer} = require('rxjs')
// import {of, interval, from, throwError, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, defer} from 'rxjs'
const {expand, catchError, mergeMap, take, map, takeUntil, takeWhile, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll}  = require('rxjs/operators')
// import {expand, take, map, takeUntil, takeWhile, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll} from 'rxjs/operators'
const _ = require('lodash')
// import * as _ from 'lodash'
// const retryLoop = require('../lib/retryloop')
const phonetic = require('phonetic')
// import * as phonetic from 'phonetic'
const { isRoot, isTail, testRoot, testTail } = require('../lib/blockutils')
// import { isRoot, isTail, testRoot, testTail } from '../lib/blockutils'

// let AWS = require('aws-sdk')
// import * as bla from 'aws-sdk'
// import {GetObjectCommand as S3, S3Client} from "@aws-sdk/client-s3"
let {GetObjectCommand, PutObjectCommand, HeadBucketCommand, S3Client} = require("@aws-sdk/client-s3")
// AWS.config.update({region: 'us-west-2'})
const parseUrl = require('./parseurl')
// import * as parseURL from './parseurl'



// TODO: handle using a bad url
/**
* S3 object that represents service driver
* @param {string} url connect string to store
* @param {number} ttl default ttl
* @returns {Observable} [next|complete] success object
* @returns {Observable} [error] failed object
*/
const DriverS3 = function(initCfg){
    // if(!initCfg.ttl) initCfg.ttl = 1000
    const urlCfg = parseUrl({url:initCfg.url})

    // if(urlCfg.tags && _.indexOf(urlCfg.tags, 'BUCKET')<0) throw new Error({field: 'url', tag: 'BUCKET'})
    if(!urlCfg.bucket) throw new Error({field: 'bucket'})
    const s3Cfg = {
        region: 'us-west-2',
        httpOptions: {
            connectTimeout: 1000,
            timeout: 1000
        },
        maxRetries: 10,
        // retryDelayOptions: {base: 3000},
        apiVersion: '2006-03-01',
        s3BucketEndpoint: false,
        s3ForcePathStyle: true, // needed with minio?
        sslEnabled: false,
        signatureVersion: 'v4',
        // endpoint: `${cfg.proto}://${cfg.host}/${cfg.bucket}:${cfg.port}`,
        endpoint: `${urlCfg.proto}://${urlCfg.host}:${urlCfg.port}`,
        credentials: {
            accessKeyId: urlCfg.user,
            secretAccessKey: urlCfg.pass    
        }
    }
    // console.log('urlCfg...')
    // console.log(urlCfg)
    // console.log('initCfg...')
    // console.log(initCfg)
    const s3 = new S3Client(s3Cfg)  
    // const s3 = new AWS.S3(s3Cfg)    
    let isConnected = false
    this.id = phonetic.generate({ seed: initCfg.url }).toLowerCase()

    // s3.send(new HeadBucketCommand({Bucket: 'myblocks'}))
    // .then((resp)=>{
    //     console.log(resp)
    //     return resp
    // })


    /**
    * Connect to the store
    * @returns {Observable} [next]
    */    
    let connect=()=>{
        
        // TODO: return observable that doesn't complete
        if(isConnected) {
        //    console.log('already connected!')
            return of(true)
        }
        const cmdCfg = {
            Bucket: urlCfg.bucket,
        }
        // return from('bla')
        return from(
            s3.send(new HeadBucketCommand(cmdCfg))
            // .then((resp)=>{
            //     console.log(resp)
            //     return resp
            // })
        )
        .pipe(
            // tap((v)=>{ console.log(v)}),
            catchError((err)=>{
                console.log('err...')
                console.log(err)
                throw new Error('failed to connect!')
            }),
            // tap(()=>{
            //     console.log('tap-connected!')
            //     isConnected = true
            // }),
            map(()=>true),
        )
    }

    /**
    * PUT an object into store
    * @param {key} param id of object without extension
    * @param {val} param contents of object to save
    * @returns {Observable} [next|complete] success save
    * @returns {Observable} [error] fail object
    */
    this.put=(c)=>{

        if(c.key.length<6 || !/^.+$/i.test(c.key)) {
            return of('asdf').pipe(
                map(()=>{
                    throw new Error({field: 'key'})
                })
            )
        }

        if(initCfg.isJSON){

            if(!_.isObject(c.val)){
               throw new Error('val not obj')
            }
            c.val = Buffer.from(JSON.stringify(c.val))
        }

        if(!initCfg.isJSON){
            if(!Buffer.isBuffer(c.val)){
                throw new Error('val not buff')
            }
        }
        let cmdCfg = {
            Bucket: urlCfg.bucket,
            Key: c.key,
            Body: c.val            
        }

        return connect()
        .pipe(
            // tap((v)=>{
            //     console.log('v...')
            //     console.log(v)
                // s3.send(new PutObjectCommand(cmdCfg))
                // .catch((v)=>console.log(v))
                // .then((v)=>console.log(v))
            // }),
            mergeMap(()=>defer(()=>from(s3.send(new PutObjectCommand(cmdCfg))))),
            map((v)=>{
                // console.log('v...')
                // console.log(v)
                return true
            }),
                // .pipe(
                //     catchError((err)=>{
                //         throw err
                //     }),
                //     map((res)=>{
                //         return {
                //             success: true
                //         }
                //     }),
                //     take(1)
                // )
        )
    } 

    /**
    * Returns an object in a store
    * @param {id} param id of object to get without extension
    * @returns {Observable} [next|complete] blob/json of object
    * @returns {Observable} [error] fail object
    */
    this.get=(c)=>{
        // console.log('././././.')
        // console.log(c)
        if(c.key.length<6 || !/^.+$/i.test(c.key)) {
            return of('asdf').pipe(
                map(()=>{
                    throw new Error({field: 'key'})
                })
            )
        }

        const cmdCfg = { 
            Bucket: urlCfg.bucket,
            Key: c.key
        }
        // console.log(cmdCfg)
        return connect()
        .pipe(
            // tap((v)=>{ 
            //     console.log('get...made it!')
            //     console.log(v)
            // }),
            concatMap(()=>defer(()=>from(s3.send(new GetObjectCommand(cmdCfg))))),
                // )
                // .pipe(
                    // tap((v)=>{ 
                    //     console.log('foobar...')
                    //     console.log(v)
                    // }),
                    // catchError((err)=>{
                        // console.log('err2...')
                        // console.log(err)
                    //     if(err.statusCode === 404 && err.code === 'NoSuchKey'){
                    //     console.log('ERRRRRRRR')
                    //     return of(null)
                    //     }
                    // }),
                    // tap((v)=>{ console.log(v)}),
                    concatMap((res)=>{
                        if(initCfg.isJSON){
                            return from(res.Body.transformToString())
                        } else {
                            return res.Body
                        }                        
                    }),
                //     take(1)
                // )
        )

    }

    /**
    * Returns bool if object exists
    * @param {key} param id of object to get without extension
    * @returns {Observable} [next|complete] blob/json of object
    * @returns {Observable} [error] fail object
    */
    this.exists=(c)=>{
        if(c.key.length<6 || !/^.+$/i.test(c.key)) {
            return of('asdf').pipe(
                map(()=>{
                    throw new Error({field: 'key'})
                })
            )
        }

        const cmdCfg = { 
            Bucket: urlCfg.bucket,
            Key: c.key
        }
        return connect()
        .pipe(
            // tap((v)=>{ 
            //     console.log('exits...made it!')
            //     console.log(v)
            // }),
            mergeMap(()=>{
                return from(
                    s3.headObject(cmdCfg)
                    .promise()
                    .catch((err)=>{
                        if(err.message===null && err.code==='NotFound' && err.statusCode === 404){
                            return false
                        }
                        throw err
                    })
                )
                .pipe(
                    map((res)=>{
                        if(res === false) return false
                        return true
                    }),
                    take(1)
                )
            })
        )

    }

    /**
    * Deletes an object in a store
    * @param {key} param id of object without extention
    * @returns {Observable} [next|complete] success object
    * @returns {Observable} [error] fail object
    */
    this.delete=(c)=>{
        if(c.key.length<6 || !/^.+$/i.test(c.key)) {
            return of('asdf').pipe(
                map(()=>{
                    throw new Error({field: 'key'})
                })
            )
        }

        const cmdCfg = { 
            Bucket: urlCfg.bucket,
            Key: c.key
        }
        return connect()
        .pipe(
            mergeMap(()=>{
                return from(
                s3.deleteObject(cmdCfg)
                .promise()
                .catch((err)=>{
                    console.error('delete: failed!')
                    // console.error(err)
                    console.error(cmdCfg)
                    throw err
                })
                )
            }),
            map((v)=>{
                // console.log(cmdCfg)
                // console.log('FOO BAR!!!!')
                // console.log(v)
            //    if(_.isObject(v) && Object.keys(v).length === 0) throw 'not found'
                return {
                    action: 'delete',
                    key: v.id,
                    ts: Date.now()
                }    
            }),
            take(1)
        )
    }

}

module.exports = DriverS3