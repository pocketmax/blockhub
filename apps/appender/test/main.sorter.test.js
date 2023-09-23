// 'use strict';
// import fetch from 'node-fetch';
const expect = require('chai').expect;
const amqp = require('amqplib');
const {of, interval, from, firstValueFrom, range, Observable, timer, lastValueFrom, queueScheduler, asyncScheduler, nullScheduler, defer} = require('rxjs')
const {expand, take, map, concatMap, pairwise, tap, delay, delayWhen, throttle, timeInterval, retry, retryWhen, last}  = require('rxjs/operators')
const yargs = require('yargs')
.usage('$0 <cmd> [args]')
const QueueDriverRabbit = require('../../drivers/rabbit_drv')

// .scriptName("block")
// .choices('service',['appender','bar'])

const argv = yargs.argv;
/* 
ON INIT
* connect to service
* connect to target

*/
let QueueDriver = null
switch(argv.driver){
    case 'rabbit':
        QueueDriver = QueueDriverRabbit
        break;
    default:
        throw 'driver is required'
}
let driver = new QueueDriver()

console.log(argv)

before((done) => {
    defer(() => from(driver.connect({url: argv.host})))
    .pipe(
        retryWhen((error)=>{
            return error.pipe(
                tap((v)=>{
                    console.log('#####################')
                    console.log('# failed to connect to service!')
                    console.log('#####################')
                    console.log(v)
                }),
                delay(500)
            )
        })
    )
    .subscribe(async () => {

        driver.setQueue(argv['in-queue'])
        .then(()=>{
            console.log('connected to service!')
            done(0)    
        })
    });
})

describe('when sorting an invalid msg', () => {

    it(`msg popped off inQueue and appended to badQueue`, (done) => {
        done()
    })

})

describe('when sorting a valid msg', () => {

    it(`msg popped off inQueue and is put in the proper outQueue`, (done) => {

        let msg = {
            chain:'bar',
            checksum:'bar'
        }
        let payload = Buffer.from(JSON.stringify(msg));
        driver.append(argv.inQueue,payload)

        let mySub = driver
        .consume(`chain_${msg.chain}`)
        .subscribe((data)=>{
            console.log('done!')
            mySub.unsubscribe()
            done()
        })
    
    });

});
