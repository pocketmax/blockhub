
const { matches } = require('ip-matching')



// allowList 
// test if src is allowed based on allow list and block list

let ipFilter = (src, allowList = [], blockList = [])=>{
    if(allowList.length & blockList.length) throw `allowList and blockList can't be populated at the same time`
    if(allowList.length){
        for(let v of allowList){
            if(check(src, v)) return true
        }    
        return false
    }
    if(blockList.length){
        for(let v of blockList){
            if(matches(src, v)) return false
        }    
        return true
    }
    throw 'something wrong'

}
module.exports = ipFilter