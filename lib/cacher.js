const {of, interval, from, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer, combineLatest} = require('rxjs')
const {expand, take, zip, map, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last}  = require('rxjs/operators')

let data = {}

/* hash cache map...
{
asdfasdfasdfasdf: 1253553434
}
*/

// load cache
// src to load cache from. if no src, use mem
let loadFn = ()=>{

    return new Observable((sub)=>{
        sub.complete()
    })
}

// add an entry
// cacher.add({key:'adfasdf',date:1231232323})
// cacher.add({key:'adfasdf'})
let addFn = ({key, date = Date.now()})=>{
    data[key] = date
}

// delete a single entry
let deleteFn = ({key})=>{

    delete data[key]

}

// emit old cache
let staleFn = ({date})=>{
    return new Observable((sub)=>{
        interval(5000)
        .subscribe(()=>{
            for(let h in data){
                if(data[h]<date) sub.next(h)
            }
        })
    })
}

// dump cache to src
// dump as csv, not JSON
let dumpFn = ()=>{
    return new Observable((sub)=>{
        sub.complete()
    })

}

module.exports = {
    load: loadFn,
    add: addFn,
    delete: deleteFn,
    stale: staleFn,
    dump: dumpFn
}