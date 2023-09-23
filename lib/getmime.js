const mimetics = require('mimetics')
let getMime = (buff)=>{
    return mimetics(buff).mime
}

module.exports = getMime