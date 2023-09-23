// const AssetFSDrv = require('./assetfsdrv')
const Store = require('./store')
const MirrorProxy = require('./mirrorproxy')
const ParseUrl = require('../lib/parseurl')

const initByType = (url, type)=>{
    const cfg = ParseUrl({url})
    let store
    // console.log('ParseUrl results...')
    // console.log(cfg)

    switch(cfg.type){
/*
        case 'file':
            console.log('assetStore: file driver')
            store = new AssetFSDrv({
                fake: true,
                blobStub: true,
                ext: cfg.ext,
                path: cfg.path
            })
            break;
*/
        case 's3':
            console.log(`S3Driver: s3`)
            store = new Store({
                type,
                url: url,
                // proto: cfg.proto,
                // host: cfg.host,
                // username: cfg.username,
                // password: cfg.password,
                // port: cfg.port,
                // bucket: cfg.bucket
            })
            break;
        default:
            throw new Error('asset driver is required!')
    }
    return store
}

const StoreFactory = function({url, type}){
    let stores = {}
    let myProxy

    // 1. split urls on ;
    // 2. loop through urls
    // 2a.  init a store object for each
    // 2b.  TODO: assign an ID based on inputs

    // 3. init proxy store with stores
    // 4. return proxy store
    let urls = url.split(';')
    if(urls.length===1){
        return initByType(urls[0], type)
    }

    for(let i of urls){
        // console.log(i)
        let store = initByType(i, type)
        stores[store.id]=store
    }

    switch(proxy){
        case 'mirror':
        default:
            myProxy = new MirrorProxy({stores})
    }
    return myProxy
}
module.exports = StoreFactory