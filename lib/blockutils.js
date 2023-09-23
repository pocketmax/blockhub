'use strict'
const md5 = require('md5')
// import * as md5 from 'md5'
const _ = require('lodash')
// import * as _ from 'lodash'
const crypto = require('crypto')
// import * as crypto from 'crypto'

const isAssetsMsg = (v)=>{
    if(!v.checksums) return false
    if(v.checksums.length == 0) return false
    return true
}

const hasNext = (v)=>{
    if(!isBlock(v)) return false
    if(!v.next) return false
    return true
}

const isRoot = (block)=>{
    if(block.height===0) return true
    return false
}

// test if all generic parts are there. supports (root, link, tail)
const isBlock = (block)=>{
    if(!block.id) return false
    if(!block.prev) return false
    if(!block.height) return false
    if(!block.assets) return false
    if(!block.payload) return false
    // if(!block.height===0) return false
    return true
}

// is tail block. assumes base block passes
const isTail = (block)=>{
    if(block.height <= 0) return false
    if(block.next) return false
    return true
}

// is seed block.
const isSeed = (block)=>{
    if(!block.chain) return false
    if(!block.checksums) return false
    if(!_.isArray(block.checksums)) return false
    return true
}

const buildRoot = ()=>{
    // a specific length
    // hex
    const cryptRand = crypto.randomBytes(20).toString('hex')
    const rand = Math.random().toString()
    const noise = crypto
        .createHmac('sha512', Buffer.from(rand, 'hex'))
        .update(cryptRand)
        .digest('hex')
    const prevId = md5(noise)
    const blockId = md5(prevId + noise)
    const block = {
        chain: blockId,
        id: blockId,
        prev: prevId,
        height: 0,
        assets: [
            noise.substr(0,32),
            noise.substr(32,32),
            noise.substr(64,32),
            noise.substr(96,32)
        ],
        payload: prevId + noise
    }
    return block
}

const buildBlock = ({block, assets})=>{
    if(!isBlock(block)) {
        console.log('block error...')
        console.log(block)
        throw new Error('invalid block')
    }

    const prevId = block.id
    const payload = prevId + assets.join('')
    const blockId = md5(payload)

    const newBlock = {
        id: blockId,
        chain: block.chain,
        height: block.height + 1,
        prev: prevId,
        assets: assets,
        payload
    }

    return newBlock
}

const testTail = (block)=>{

    // block.id field
    if(!/^[a-f0-9]{32}$/.test(block.id)) throw new Error(`id invalid regex (${block.id})`)

    const calcId = md5(`${block.prev}${block.assets.join('')}`)
    if(calcId !== block.id) throw new Error(`id calc mismatch id(${block.id}) vs calc(${calcId})`)

    // block.prev field
    if(!/^[a-f0-9]{32}$/.test(block.prev)) throw new Error(`prev invalid regex (${block.prev})`)
    const calcPrev = md5(`${block.assets[0]}${block.assets[1]}`)
//    if(calcPrev !== block.prev) throw new Error(`prev calc mismatch prev(${block.prev}) vs calc(${calcPrev})`)

    // block.next field
    if(block.next) throw new Error(`next field exists (${block.next})`)

    // block.height field
    if(!Number.isInteger(block.height)) throw new Error(`height is not a number (${block.height})`)
    if(block.height === 0) throw new Error(`height = 0 which is a root block`)

    // block.payload field
    // if(!/^[a-f0-9]+$/.test(block.payload)) throw new Error(`payload invalid regex (${block.payload})`)

    return true
}

const testRoot = (block)=>{
    console.log(block)
    // block.id field
    if(!/^[a-f0-9]{32}$/.test(block.id)) throw new Error(`id invalid regex (${block.id})`)

    const calcId = md5(`${block.prev}${block.assets.join('')}`)
    if(calcId !== block.id) throw new Error(`id calc mismatch id(${block.id}) vs calc(${calcId})`)

    // block.prev field
    if(!/^[a-f0-9]{32}$/.test(block.prev)) throw new Error(`prev invalid regex (${block.prev})`)
    const calcPrev = md5(`${block.assets[0]}${block.assets[1]}`)
    // if(calcPrev !== block.prev) throw new Error(`prev calc mismatch prev(${block.prev}) vs calc(${calcPrev})`)

    // block.next field
    if(block.next && !/^[a-f0-9]{32}$/.test(block.next)) throw new Error(`next invalid regex (${block.next})`)

    // block.height field
    if(!Number.isInteger(block.height)) throw new Error(`height is not a number (${block.height})`)
    if(block.height !== 0) throw new Error(`height != 0 which is a link block`)

    // block.payload field
    if(!/^[a-f0-9]+$/.test(block.payload)) throw new Error(`payload invalid regex (${block.payload})`)

    // block.assets field
    if(block.assets.length !== 2) throw new Error(`block.assets length!=2 (${block.assets.length})`)
    if(block.assets[0] !== block.assets[1]) throw new Error(`block.assets elements aren't equal (${block.assets[0]}!=${block.assets[1]})`)

    return true
}

const testBlock = (block)=>{

    // block.id field
    if(/^[a-f0-9]{32}$/.test(block.id)) throw new Error(`id invalid regex (${block.id})`)

    const calcId = md5(`${block.prev}${block.assets.join('')}`)
    if(calcId !== block.id) throw new Error(`id calc mismatch id(${block.id}) vs calc(${calcId})`)

    // block.prev field
    if(/^[a-f0-9]{32}$/.test(block.prev)) throw new Error(`prev invalid regex (${block.prev})`)

    // block.next field
    if(/^[a-f0-9]{32}$/.test(block.next)) throw new Error(`next invalid regex (${block.next})`)

    // block.height field
    if(!Number.isInteger(block.height)) throw new Error(`height is not a number (${block.height})`)
    if(block.height === 0) throw new Error(`height = 0 which is a root block`)

    // block.payload field
    if(/^[a-f0-9]+$/.test(block.payload)) throw new Error(`payload invalid regex (${block.payload})`)

    // block.assets field
    for(let i in block.assets){
        if(/^[a-f0-9]+$/.test(block.assets[i])) throw new Error(`assets[${i}] invalid regex (${block.assets[i]})`)
    }


    return true
}


const testLink = (pBlock, block)=>{

    if( pBlock.height !== block.height - 1 ){
       console.error(`height mismatch pBlock.height = ${pBlock.height} block.height = ${block.height}`)
       return false
    }

    if( pBlock.id !== block.prev ){
        console.error(`prev mismatch pBlock.id != block.prev`)
        return false
    }

    if( pBlock.next !== block.id ){
        console.error(`id mismatch pBlock.next != block.id`)
        return false
    }

    return true
}

module.exports = {
    hasNext,
    isAssetsMsg,
    isRoot,
    isBlock,
    isTail,
    isSeed,
    buildRoot,
    buildBlock,
    testRoot,
    testBlock,
    testTail,
    testLink
}
