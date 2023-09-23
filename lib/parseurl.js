'use strict';

    // url: 'file:///assets/%ASSET_ID%.blob',
    // url: 'file:///data/blocks/%BLOCK_ID%.block',
    // url: '///data/blocks/%BLOCK_ID%.block',
    // url: '//data/blocks/%BLOCK_ID%.block',
    // url: '/data/blocks/%BLOCK_ID%.block',
/*
res: {
    type: 'fs',
    ext: 'blob',
    path: '/assets',
    paths: ['assets'],
    tags: ['ASSET_ID']
}
*/


const parseFS = ()=>{
}

const parseS3AWS = (cfg)=>{

    cfg.type = 's3'
    cfg.bucket = cfg.host.substr(0,cfg.host.indexOf('.'))
    let bla = cfg.host.replace('.amazonaws.com','').replace(cfg.bucket,'').slice(1)
    if(/^s3-website/.test(bla)){
        cfg.region = bla.substr(11)

    } else if(/^s3-/.test(bla)) {
        cfg.region = bla.substr(3)
    }
    return cfg
}


const parseS3 = (cfg)=>{

    cfg.type = 's3'
    // aws s3 target
    if(/amazonaws.com$/.test(cfg.host)){
        return parseS3AWS(cfg)
    }

    cfg.bucket = cfg.paths[0]
    return cfg
}

const parseAmqp = (cfg)=>{
    // console.log(cfg)
    return cfg
}

const parseSQL = ()=>{
}

const getTags = (path)=>{
    return Array.from(path.matchAll(new RegExp("%([a-z0-9]+)%", "gi")), m => m[1])

}

const ParseUrl = function({url}){

    if(!url) throw new Error({field: 'url'})

    // let baseCfg
    let urlCfg = {}
    let urlAlt = new URL(url)
    if(urlAlt.username !== '') urlCfg.user = urlAlt.username
    if(urlAlt.password !== '') urlCfg.pass = urlAlt.password
    urlCfg.proto = urlAlt.protocol.slice(0,-1)
    urlCfg.host = urlAlt.hostname
    if(urlAlt.port!=='') urlCfg.port = Number(urlAlt.port)
    urlCfg.path = urlAlt.pathname
    if(urlAlt.pathname==='/'){
        urlCfg.paths = []
    } else {
        urlCfg.paths = urlAlt.pathname.slice(1).split('/')
    }
    urlCfg.ext = urlCfg.path.substr(urlCfg.path.lastIndexOf('.')+1)
    // adds .tags array without %%
    if(urlCfg.path) urlCfg.tags = getTags(urlCfg.path)

    let urlNew
    if(/^http:|^https:|^S3:/i.test(url)) {
        urlNew = parseS3(urlCfg)
    // } else if(/^file:/.test(url)) {
    //     baseCfg = parseFS(urlCfg)
    // } else if(/^\//.test(url)) {
    //     baseCfg = parseFS(urlCfg)
    } else if(/^amqp:|^amqps:/i.test(url)) {
        urlNew = parseAmqp(urlCfg)
    } else {
        throw new Error('unknown url')
    }

    return urlNew
}
module.exports = ParseUrl