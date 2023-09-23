# chain utility

## web UI
## API
/api

GET /block/{block_id}   <- get a block
POST /chain             <- create chain (create root block)
GET /chain/tail     <- walks chain and returns tail
GET /asset/{asset_id}   <- get asset blob
GET /chains         <- get all root blocks across all block stores

## CLI

walk chain
get tail
get tail live
grep asset strings
create root block
list root blocks

Web client
* list chains
* walk chain
* grep plain text blobs
* no support for none-s3 block stores

node script
* create chain
* cache blocks
* walk chain
* grep plain text blobs
* sql, mongo data sources
