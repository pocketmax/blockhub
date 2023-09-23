const {Subject, of, combineLatest, AsyncSubject, interval, from, firstValueFrom, range, Observable, timer, queueScheduler, asyncScheduler, nullScheduler, defer, EMPTY, merge} = require('rxjs')
const { ajax } = require('rxjs/ajax')
const {expand, take, map, concatAll, skip, concatMap, pairwise, tap, repeat, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last, bufferCount, bufferWhen, bufferToggle, catchError}  = require('rxjs/operators')

global.XMLHttpRequest = require('xhr2');
   
const Append = ({url, body})=>{

    return ajax({
        url: url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    })
    .pipe(
        catchError(v=>{
            console.log('appender POST: failed!')
            if(!v.response) {
                console.error('connect failure!')
            } else if(v.response.status!==201) {
                    console.error('failed to create!')
            } else {
                console.error('UNKNOWN ERROR!')
            }
        }),
        retry({delay: 1000})
    )


}


module.exports = Append