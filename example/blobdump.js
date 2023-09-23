'use strict';
const fs = require('fs');
const plcHldrComments = require('./stubs').commentStream
const plcHldrPhotos = require('./stubs').photoStream
const plcHldrPhotoBlobs = require('./stubs').photoBlobStream

/*
plcHldrComments
.subscribe((x)=>{
    console.log(x)

    for(let obj of x){
        console.log(obj)
        fs.writeFileSync(`./blobs/placeholder-comments-${obj.id}.json`, Buffer.from(JSON.stringify(obj)), err => {
            if (err) {
                console.error(err);
            }
        })
    }
})

plcHldrPhotos
.subscribe((x)=>{
    console.log(x)
    fs.writeFileSync(`./blobs/placeholder-photos-${x.id}.json`, Buffer.from(JSON.stringify(x)), err => {
        if (err) {
            console.error(err);
        }
    })

})
*/

plcHldrPhotoBlobs
.subscribe((x)=>{
    console.log(x)
    // fs.writeFileSync(`./blobs/placeholder-photoblobs-${x.id}.json`, Buffer.from(JSON.stringify(x)), err => {
    //     if (err) {
    //         console.error(err);
    //     }
    // })

})
