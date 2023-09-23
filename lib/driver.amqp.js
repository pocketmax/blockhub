const amqp = require('amqplib');
const {of, interval, from, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer, Subject, throwError} = require('rxjs')
const {expand, take, map, concatMap, mergeMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, catchError}  = require('rxjs/operators')
const MyError = require('../lib/myerror')
const parseUrl = require('./parseurl')
const DriverAMQP = function(initCfg){

    // console.log(initCfg)
    let conn = null
    let chan = null
    let isConnected = false
    const urlCfg = parseUrl({url:initCfg.url})
    console.log(urlCfg)

    // return promise
    const connect = ()=>{
        // console.log('connect called!')
        return defer(()=>from(
            amqp.connect(initCfg.url)
            // .catch(err=>{
            //     console.log('err...')
            //     console.log(err)
            // })
        ))
        .pipe(
            // catchError((v)=>{
            //     console.log('v...')
            //     console.log(v)
            // }),
            tap(v=>{
                    // console.log(v)
                if(conn){
                    // console.log('conn EXISTS!')
                } else {
                    // console.log('conn NOT FOUND!')
                    // console.log('creating CONN!')
                    isConnected = true
                    conn = v
                }
                conn.on('error',()=>{
                })
                conn.on('blocked',()=>{            
                })
                conn.on('unblocked',()=>{
                })

            }),
            mergeMap(()=>{
                // console.log('!adsf456!')
                // console.log('123456')
                // return defer(()=>from(of('test')))
                return defer(()=>from(
                    conn.createChannel()
                    // .catch(err=>{
                    //     console.log('err...')
                    //     console.log(err)
                    // })
                    // .then(resp=>{
                    //     console.log('resp...')
                    //     console.log(resp)
                    //     return resp
                    // })

                ))
                .pipe(
                    // retry({count: 2, delay: 1000}),
                    tap(x=>{
                        if(chan){
                            // console.log('chan EXISTS!')
                        } else {
                            // console.log('chan NOT FOUND!')
                            // console.log('creating CHAN!')
                            chan = x
                        }
                        // console.log(chan)
                        // isConnectedStream.next(true)
                        // isConnectedStream.next(chan)
                    })
                )
                // map(v=>true)
            })
        )
    }

    this.setQueue = ({queue})=>{
        if(!queue) throw new MyError({field:'queue'})

        return connect()
        .pipe(
            mergeMap(()=>{
                return defer(()=>from(
                    chan.assertQueue(queue, {durable: false})
                ))        
            }),
            take(1)
        )
    }

    this.getQueueInfo = ({queue})=>{
        // if(!isConnected) throw 'MsgRabbitDrv.getQueueInfo: not connected!1'
        // if(!chan) throw 'MsgRabbitDrv.isQueueSet: unset chan'
        if(!queue) throw 'MsgRabbitDrv.getQueueInfo: unset queue'
        if(queue==='') throw 'MsgRabbitDrv.getQueueInfo: empty queue'
        if(/@/.test(queue)) throw 'MsgRabbitDrv.getQueueInfo: invalid queue'
        return connect()
        .pipe(
            tap(()=>{
                console.log('foobar...')
            }),
            mergeMap(()=>{
                console.log('chan...')
                // console.log(chan)
                return defer(x=>from(chan.checkQueue(queue, {})))  
            })
        )

        return defer(x=>from(chan.checkQueue(queue, {})))
        .pipe(
            map((a)=>{
                if(a.messageCount && a.consumerCount && a.queue){
                    return {
                        msgCount: a.messageCount,
                        consumerCount: a.consumerCount
                    }
                }
                return throwError(false)
            }),
            retryWhen(errors =>
                errors.pipe(
                  tap(() => console.log(`MsgRabbitDrv.getQueueInfo: ${queue} not found`)),
                  delayWhen(() => timer(2000))
                )
            ),
            // retry({count: 1, delay: 1000}),
            take(1)
        )
    }

    this.append = ({queue, msg})=>{
        if(!queue) throw new MyError({field: 'queue'})
        if(queue==='') throw new MyError({field: 'queue'})
        if(/@/.test(queue)) throw new MyError({field: 'queue'})

        if(!msg) throw new MyError({field: 'msg'})
        if(!Buffer.isBuffer(msg)) throw new MyError({field: 'msg'})
        if(msg.length === 0) throw new MyError({field: 'msg'})
        return connect()
        .pipe(
            mergeMap(()=>{
                return defer(()=>from(
                    Promise.resolve(chan.sendToQueue(queue, msg))
                ))        
            }),
            take(1)
        )
    }

    // TODO: emit error on no msg
    // TODO: emit val/comp on msg
    this.pop = ({queue})=>{
        return connect()
        .pipe(
            mergeMap(()=>{
                return defer(x=>from(chan.get(queue)))  
            }),
            take(1),
            // filter(v => v !== false)
        )

        return defer(x=>from(chan.get(queue)))
        // return from(chan.get(queue))
        .pipe(
            catchError((err)=>{
                if(err.fields && err.fields.replyCode && err.fields.replyCode === 404) {
                    console.error(`ERROR: queue not found: ${queue}`)
                } else {
                    console.log('Unknown error...')
                    console.log(err)
                }
            }),
            // tap(()=>console.log('foobar1')),
            map(v=>{
                if(v===false){
                    console.log('queue pop gave empty')
                    throw 'nothing to pop'
                }
                return v
            }),
            retry({count: 1, delay: 1000}),
            take(1)
        )

    }

    this.ack = ({msg})=>{
        if(!msg) throw new MyError({field: 'msg'})

        return connect()
        .pipe(
            map(()=>{
                // return defer(x=>from(chan.ack(msg)))  
                // console.log('ZZZ!@#!@#!@#!@#!@#!@#!@#!@#')
                chan.ack(msg)
                return of(true)
            })
        )
    }
    this.nack = ({msg})=>{
        if(!msg) throw new MyError({field: 'msg'})

        return connect()
        .pipe(
            map(()=>{
                // return defer(x=>from(chan.ack(msg)))  
                // console.log('ZZZ!@#!@#!@#!@#!@#!@#!@#!@#')
                chan.nack(msg)
                return of(true)
            })
        )
    }
    this.reject = ({msg})=>{
        if(!msg) throw new MyError({field: 'msg'})

        return connect()
        .pipe(
            map(()=>{
                // return defer(x=>from(chan.ack(msg)))  
                // console.log(msg)
                console.log('REJECT!@#!@#!@#!@#!@#!@#!@#!@#')
                // chan.nack(msg, {requeue: false})
                chan.reject(msg)
                return of(true)
            })
        )
    }
    this.ackAll = ({msgs})=>{

        return connect()
        .pipe(
            mergeMap(()=>{
                for(let payload of msgs){
                    this.ack(payload)
                }
                return true
            })
        )
    }

}
module.exports = DriverAMQP