// 'use strict';
// import fetch from 'node-fetch';
const fetch = require('node-fetch')
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


before((done) => {
    defer(() => from(driver.connect({url: argv.service})))
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

before((done) => {
    defer(() => from(fetch(argv.target,{method: 'POST'})))
    .pipe(
        retryWhen((error)=>{
            return error.pipe(
                tap((v)=>{
                    console.log('#####################')
                    console.log('# failed to connect to target!')
                    console.log('#####################')
                    console.log(v)
                }),
                delay(500)
            )
        })
    )
    .subscribe(async (conn) => {
        console.log('connected to target!')
        done()
    });
})

describe('when writing a checksum', () => {

    it(`fails with an empty payload`, (done) => {

        fetch(argv.target, {
            method: 'POST',
            body: JSON.stringify({foo:'bar'}),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json())
        .catch(err => {
            throw err
        })
        .then(res => {
            // console.log(res)
            console.log('made it!')
            done()
        });
            // expect(1).to.equal(1);
    });

    it(`fails with a syntax error in payload`, (done) => {
        fetch(argv.target, {
            method: 'POST',
            body: "my bad payload",
            // headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json())
        .catch(err => {
            done()
        })
        // .then(res => {
            // console.log('made it!')
        // });

    });

    it(`fails with a schema error in payload`, (done) => {
        fetch(argv.target, {
            method: 'POST',
            body: "my bad payload",
            // headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json())
        .catch(err => {
            done()
        })
        .then(res => {
            done(1)
        });
    });

    it(`fails with a schema error in payload`, (done) => {
        fetch(argv.target, {
            method: 'POST',
            body: JSON.stringify({foo:'bar'}),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json())
        .catch(err => {
            done()
        })
        .then(res => {
            done(1)
        });
    });

    it(`valid msg is sent to target and popped from service queue`, (done) => {

        fetch('http://target/append', {
            method: 'POST',
            body: JSON.stringify({
                chain:'20f4731780c2cabbfa13128ced58ba43', 
                checksum: '30f4731780c2cabbfa13128ced58ba43'}),
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json())
        .catch(err => {
            done(1)
        })
        .then(res => {
            // TODO: test for response payload schema
            driver.consume(argv['in-queue'])
            .subscribe((payload)=>{
                console.log('got msg...')
                let msg = JSON.parse(payload.content.toString())
                console.log(msg)
                done()
            });
    
        });

    });

});
