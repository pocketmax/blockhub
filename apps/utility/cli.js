/*

// walk segment
nodemon apps/utility/cli.js walk --from=d5dc3ea0a8077ac8bdeead95e783462c --to=0b400cbcde693b25500f0ac387a0d879 --chain=e82de5b2b56297fd04e7cfe02f150a2b
nodemon apps/utility/cli.js walk --to=0b400cbcde693b25500f0ac387a0d879 --chain=e82de5b2b56297fd04e7cfe02f150a2b

// walk live
nodemon apps/utility/cli.js walk --from=d5dc3ea0a8077ac8bdeead95e783462c --chain=e82de5b2b56297fd04e7cfe02f150a2b

* create chain - create root block and uploads to block store
* list chains - list all chain IDs on block store
* walk chain - walks chain making sure all blocks are there
* walk chain live - walk chain
* search assets - search in asset blobs
* verify assets - walks chain and verifies asset hash matches block
* verify chain - walks chain verifying all hashes in blocks
* get block info - show info for a single block
* get asset info - show info for a single asset
  - show mime type
  - show meta data of blob if available
  - if it can't be displayed, put <blob> mark instead

# OBSERVABLES
createChain() - creates root block and sends to block stores
walkChain(from,to) - walk with asset blobs
walkChainWithAssets(from,to) - walk with asset blobs
walkChainToLive(from,to) - walk to live
walkChainToLiveWithAssets(from,to) - walk to live with asset blobs
docQuery(query) - query asset doc

# OPERATORS
verifyLink - test prev/next blocks
verifyBlock - verify a block
verifyAssets - verify given block and given asset blobs


# CLI CMD
get-tail
walk-chain
walk-chain-live
walk-chain-assets
walk-chain-assets-live



## CREATE CHAIN (ROOT BLOCK)
// CMD create-chain
// CMD create-chain --hash-only

## GET TAIL
// CMD get-tail
// CMD get-tail-live - gets what ever the new tail is live

## CMD examples
// create chain
// get tail
// walk # walk live
// walk --from=hash # walk live
// walk --from=hash --to=hash # walk segment of blocks
// walk --to=hash # walk segment from root
// walk assets --limit=2 mytext # show first 2 matches in string search
// walk assets --limit=2 --find=mytext # show first 2 matches in string search
// walk assets --limit=2 --find:regex=/$[a-z]/ # show first 2 matches in regex search
// walk assets --limit=2 --find:query=.test.ing # show first 2 matches in doc query

## WALK CHAIN
// CMD walk-range [FROM] [TO] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS]
## WALK CHAIN - SEGMENT
// CMD walk-range [FROM] [TO] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS]
## WALK CHAIN - SEGMENT TO TAIL
// CMD walk-range [FROM] -[TO] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS]
## WALK CHAIN - SEGMENT FROM ROOT
// CMD walk-range -[FROM] [TO] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS]

## WALK CHAIN - LIVE
// CMD walk-chain-live [FROM] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS]
// CMD walk-chain-live

## WALK CHAIN - VERIFY
// CMD walk-chain-live [F|FROM] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS]
// CMD walk-chain-live [-f from] --verify # walk chain segment and verify everything
// CMD walk-range [-f from] [-t to] --verify-blocks # walk chain segment and verify all blocks
// CMD walk-range [-f from] [-t to] --verify-assets # walk chain segment and verify assets

## WALK CHAIN ASSETS - GREP ASSET OBJECTS
// CMD walk-chain-assets [SKIP] [LIMIT] [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS] [DOC-QUERY]
// CMD walk-chain-assets --limit=1 /foo=bar # stop on first match
// CMD walk-chain-assets --limit=10 .foo=bar # limit results
// CMD walk-chain-assets --skip=2 --limit=5 .foo=bar # skip/limit results
## GREP ASSET OBJECTS - VERIFY
// CMD walk-chain-assets --limit=1 --verify # stop on first match and verify while walking

## WALK CHAIN ASSETS LIVE - GREP ASSET OBJECTS
// CMD walk-chain-assets-live [VERIFY|VERIFY-BLOCKS|VERIFY-ASSETS] [DOC-QUERY]
// CMD walk-chain-assets-live --limit=1 /foo=bar # stop on first match
// CMD walk-chain-assets-live --limit=10 .foo=bar # limit results
// CMD walk-chain-assets-live --skip=2 --limit=5 .foo=bar # skip/limit results


// CMD msg --chain=hash deboard --chain=hash --msg=txt --what ever attribute for deboard 
// CMD chain list empty-blocks
// CMD create msg deboard --chain=hash --json=txt 
// CMD create msg custom --chain=hash --json=txt 
// CMD walk chain verify on live
// CMD asset [assetID] show
// CMD asset [assetID] list blocks

// CMD block [blockID] verify [-p prev] [-i id] [-a assets] [-n next]



// walk chain segment and verify each block

// CMD chain [chainID] walk [-t to]
// --from default = chainID

// CMD block [blockID] verify --fetch-assets

// CMD msg [msgID] verify assets

ff451046263a30ad30d81b276d5ddf18
*/
const {of, pipe, merge, interval, from, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer, combineLatest, zip} = require('rxjs')
const { ajax } = require('rxjs/ajax')
const {expand, concatAll, mergeAll, take, map, filter, mapTo, mergeMap, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, catchError}  = require('rxjs/operators');
const md5 = require('md5');
const buildRoot = require('../../lib/blockutils').buildRoot
const Store = require('../../lib/store')
const Walker = require('../../lib/walker')
const getMime = require('../../lib/getmime')
const yargs = require('yargs')
.scriptName("utility")
.usage('$0 <cmd> <sub> [args]')
.command('create-chain', 'create the chain', {
    'dry-run': {
        required: false,
        type: 'boolean'
      }
})
.command('get-tail', 'return just the tail', {
    chain: {
        required: true,
        type: 'string'
      }
})
// nodemon cli.js get-block e82de5b2b56297fd04e7cfe02f150a2b
.command('get-block', 'return just the block', {
})
// nodemon cli.js get-asset 5b03f82c6b01fc3c92dd03f3d0a0d8a4
.command('get-asset', 'return just the asset', {

})
// nodemon cli.js verify-blocks e82de5b2b56297fd04e7cfe02f150a2b
.command('verify-blocks', 'only show blocks with issues', {
})
.command('verify-assets', 'only show assets with bad checksums', {
})

.command('walk', 'return blocks within range', {
    // TODO: this stuff
    // from & to === valid
    // from & !to === valid (use tail)
    // !from & to === valid (use chain)
    // !from & !to === valid (use chain and tail)
    from: {
        required: false,
        type: 'string'
    },
    to: {
        required: false,
        type: 'string'
    },
    chain: {
        required: false,
        type: 'string'
    }
})
.command('walk-chain-assets', 'my desc', {
})
.command('walk-chain-assets-live', 'my desc', {
})
const argv = yargs.argv;

const blockStore = new Store({url: 'http://minio:g3d2g5fh43@143.110.150.190:9000/myblocks', isJSON: true, ext:'block'})
const assetStore = new Store({url: 'http://minio:g3d2g5fh43@143.110.150.190:9000/myassets', isJSON: false, ext:'asset'})
const walker = new Walker({store:blockStore, chain: argv.chain})

// returns stream
const createChain = ()=>{
    const block = buildRoot()

    if(argv.dryRun){
        console.log('dry run!')
        return of(block.id)
    }
    return blockStore.put({key:block.id, val:block})
    .pipe(
        map(()=>{
            return block.id
        })
    )
}
console.log(argv)
const getTail = ()=>{
    return walker.getTail({})
}

const walk = ()=>{
    // walk range
    if(argv.to){
        return walker.toTail({
            startId:argv.from,
            stopId:argv.to
        })
    // walk live
    } else {
        return walker.toLive({
            startId:argv.from,
            stopId:argv.to
        })
    }
}


switch(argv['_'][0]){
    case 'create-chain':
        console.log('create chain!')
        createChain()
        .subscribe({
            error: ()=>{
                console.error('something went wrong')
            },
            next:(blockId)=>{
                console.log(`create chain next: ${blockId}`)
            },
            complete:()=>{
                console.log('create chain completed!')
            },
        })    
        break;
    case 'get-tail':
        console.log('get tail!')
        getTail()
        .subscribe({
            error: ()=>{
                console.error('something went wrong')
            },
            next:(resp)=>{
                console.log(`get tail next:`)
                console.log(resp)
            },
            complete:()=>{
                console.log('get tail completed!')
            },
        })    
        break;
    case 'get-block':
        console.log('get block!')
        blockStore.get({key: argv['_'][1]})
        .subscribe({
            error: ()=>{
                console.error('get-block: error!')
            },
            next:(resp)=>{
                console.log(resp)
            },
            complete:()=>{
                console.log('get-block: completed!')
            }
        })
        break;
    case 'get-asset':
        console.log('get asset!')
        assetStore.get({key: argv['_'][1]})
        .subscribe({
            error: ()=>{
                console.error('get-asset: error!')
            },
            next:(resp)=>{
                if(Buffer.isBuffer(resp)){
                    console.log('mime: ' + getMime(resp))
                    console.log('size: ' + resp.length)
                } else {
                    console.log(resp)
                }
            },
            complete:()=>{
                console.log('get-asset: completed!')
            }
        })
        break;
    case 'verify-blocks':
        console.log('verify blocks!')
        walker.getTail({
            startId: argv['_'][1],
            verify: true
        })
        .subscribe({
            error: (err)=>{
                console.error('verify-blocks: error!')
                console.log(err)
            },
            next:(block)=>{
                console.log(block)
            },
            complete:()=>{
                console.log('verify-blocks: completed!')
            }
        })
        break;
    case 'verify-assets':
        console.log('verify assets!')
        break;
    case 'walk':
    console.log('walk!')
        walk()
        .subscribe({
            error: ()=>{
                console.error('something went wrong')
            },
            next:(resp)=>{
                console.log(`walk range next:`)
                console.log(resp)
            },
            complete:()=>{
                console.log('walk completed!')
            },
        })          
        break;
    default:
        throw 'big error!';
}

