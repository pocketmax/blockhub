'use strict';

// Factory for drivers. Just passes through input args

const DriverS3 = require('./driver.s3')
// import * as DriverS3 from './driver.s3'
const DriverAMQP = require('./driver.amqp')
// import * as DriverAMQP from './driver.amqp'


// const DriverStub = require('./driver.s3')
const driverFactory = (cfg)=>{
    if(!cfg.url) throw new Error('url required')
    const proto = cfg.url.match(/^(\w+):/)[1]
    let driver
    switch(proto){
        case 's3':
        case 'http':
        case 'https':
            console.log('driver.js: picked DriverS3!')
            driver = new DriverS3(cfg)
            break;
        case 'amqp':
        case 'amqps':
            driver = new DriverAMQP(cfg)
            break;

        default:
            throw new Error('unknown url protocol')
    }
    return driver    
}
module.exports = driverFactory