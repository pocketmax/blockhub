

const url = 'http://minio:g3d2g5fh43@143.110.150.190:9000/myassets'
const ParseUrl = require('../../lib/parseurl')
const AssetS3Drv = require('../assetS3drv')
const md5 = require('md5')
const colors = require('colors')
const cfg = ParseUrl({url})
store = new AssetS3Drv({
    url: url,
    proto: cfg.proto,
    host: cfg.host,
    username: cfg.username,
    password: cfg.password,
    port: cfg.port,
    bucket: cfg.bucket
})

store.connect()
.subscribe(()=>{
  console.log('connected to store!')
  const asset = {
    id: md5(Date.now()),
    blob: Buffer.alloc(200),
  }
  console.log(`key ID: ${asset.id}`)
  store.put({id: asset.id, blob: asset.blob})
  .subscribe({
      error: ()=>console.error('put an asset[error]: failure!'.red),
      next: (v)=>{
          console.log('put an asset[next]: success!'.green)
          console.log(v)
      },
      complete: ()=>{
          console.log('put an asset[complete]: success!'.green)
      }
    })


})
