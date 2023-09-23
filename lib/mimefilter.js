
// TODO: support wildcards
// image/*
// */jpg
// */*
// *
// allow[] + !block = match allow only
// !allow + block[] = match everything except block
// no allow + block
/*
image/avif
image/vnd.microsoft.icon
image/bmp
image/webp
image/tiff
image/gif
image/jpeg
image/png
audio/aac
audio/midi
audio/x-midi
audio/wav
audio/webm
audio/mpeg
audio/opus
audio/ogg
font/otf
font/woff
font/woff2
font/ttf
video/x-msvideo
video/ogg
video/mp4
video/mpeg
text/javascript
text/html
text/calendar
text/javascript
text/css
text/csv
text/plain
application/json
application/ld+json
application/x-abiword
application/x-freearc
application/ogg
application/java-archive
application/vnd.amazon.ebook
application/octet-stream
application/x-bzip
application/x-bzip2
application/x-cdf
application/x-csh
video/mp2t
video/webm
*/



// allowList 
// test if src is allowed based on allow list and block list

let check = (src, trg)=>{
    if(src === trg) return true
}

let mimeFilter = (src, allowList = [], blockList = [])=>{
    if(allowList.length & blockList.length) throw `allowList and blockList can't be populated at the same time`
    if(allowList.length){
        for(let v of allowList){
            if(check(src, v)) return true
        }    
        return false
    }
    if(blockList.length){
        for(let v of blockList){
            if(check(src, v)) return false
        }    
        return true
    }
    throw 'something wrong'

}
module.exports = mimeFilter