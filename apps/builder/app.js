const {of, merge, pipe, interval, forkJoin, from, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer, combineLatest, Subject, SubjectReplay} = require('rxjs')
const { ajax } = require('rxjs/ajax')
const {expand, take, map, filter, mapTo, catchError, mergeMap, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, concatAll}  = require('rxjs/operators')
// const ConfirmChainAssets = require('../lib/confirmchainassets')
// const MsgRabbitDrv = require('../stores/msgrabbitdrv')
// const Fact = require('../stores/storefactory')
const _ = require('lodash')
const Store = require('../../lib/store')
const MsgBroker = require('../../lib/msgbroker')
const Walker = require('../../lib/walker')
const buildBlock = require('../../lib/blockutils').buildBlock
const isTail = require('../../lib/blockutils').isTail
const isSeed = require('../../lib/blockutils').isSeed

console.log('builder started!')

const yargs = require('yargs')
.scriptName("builder")
.usage('$0 <cmd> [args]')
.option('chain',{
    required: true,
    type: 'string',
    description: 'chain to build blocks for'
})
.option('broker',{
    required: true,
    type: 'string',
    description: 'where to pop msgs from'
})
.option('queue',{
    required: true,
    type: 'string'
})
.option('store',{
    required: true,
    type: 'string',
    description: 'where to upload new blocks'
})
const argv = yargs.argv

const store = new Store({url: argv.store, isJSON: true, ext:'block'})
const walker = new Walker({store, chain: argv.chain})
const msgBroker = new MsgBroker({url: argv.broker})

// emit error if didn't work
const setNextField = (srcBlock, trgBlock)=>{

    srcBlock.next = trgBlock.id
    console.log(`srcBlockId:${srcBlock.id} trgBlockId:${trgBlock.id}`)

    return store.put({key: srcBlock.id, val: srcBlock})
}

const popMsg = ()=>{
    // expect rMsg
    return msgBroker.pop({queue:argv.queue})
    .pipe(
        map((msg)=>{
            try {
                if(msg.content) JSON.parse(msg.content.toString())
            } catch(e){
                console.error('failed to parse popped msg')
                // TODO: bug with .nack and .reject won't work
                msgBroker.ack({msg})
                .subscribe(()=>console.log('msg nack!'))

                throw new Error('failed to parse popped msg')
            }
            if( !isSeed(JSON.parse(msg.content.toString())) ){
                console.error('popped msg is not a valid seedBlock')
                msgBroker.ack({msg})
                .subscribe(()=>console.log('msg nack!'))
                throw new Error('popped msg is not a valid seedBlock')

            } 
            return msg
        }),
        retry(),
    )
}

console.log('walking chain for tail block...')
walker.getTail({})
.pipe(
    expand((stageBlock) => {
        console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-')
        console.log('-=-=-=-=-=-=-start of loop...=-=-=-=-=-=-=-')
        console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-')
        console.log(stageBlock)
        if(!isTail(stageBlock)) {
            // console.log(stageBlock)
            console.error('stageBlock is invalid! I SHOULD ALWAYS HAVE A VALID STAGEBLOCK!')
            process.exit(1)
        }
        // only emit rMsg
        return popMsg()
        .pipe(
            map((msg)=>{
                if(!msg){
                    console.error('no rMsg! I SHOULD ALWAYS HAVE A msg!')
                    process.exit(1)
                }
                let seedBlock = JSON.parse(msg.content.toString())
                if(!isSeed(seedBlock)){
                    console.error('invalid seedBlock!')
                    process.exit(1)
                }
                console.log('!+!+!+!+!+!popped msg (seedBlock)...+!+!+!+!+!+!+')
                console.log(seedBlock)
                const newBlock = buildBlock({block:stageBlock, assets:seedBlock.checksums})
                console.log('%^%^%^%^%^%^(new block)%^%^%^%^%^%^%^%^%^')
                console.log(newBlock)
                return {
                    newBlock,
                    stageBlock,
                    msg
                }
        
            }),
            concatMap(({newBlock, stageBlock, msg})=>{
                return store.put({key:newBlock.id, val:newBlock})
                .pipe(
                    concatMap(()=>msgBroker.ack({msg})),
                    concatMap(()=>setNextField(stageBlock, newBlock)),
                    map(()=>{
                        return newBlock
                    })
                )
            })
        )
    })
)
.subscribe((a)=>{
//    console.log(a)
})
