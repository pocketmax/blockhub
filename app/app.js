const Hapi = require('@hapi/hapi');

const init = async () => {

    const server = Hapi.server({
        port: process.env.PORT || 80,
        routes: {
            cors: {
                origin: ['*'], // an array of origins or 'ignore'
                headers: ['Authorization'], // an array of strings - 'Access-Control-Allow-Headers'
                exposedHeaders: ['Accept'], // an array of exposed headers - 'Access-Control-Expose-Headers',
                additionalExposedHeaders: ['Accept'], // an array of additional exposed headers
                maxAge: 60,
                credentials: true // boolean - 'Access-Control-Allow-Credentials'
            }
        }
    });

    server.route({
        method: '*',
        path: '/{all*}',
        options: {
            payload: {
                parse: false
            }
        },
        handler: async function (request, h) {
            // console.log(req.payload)
            // console.log(Buffer.from(req.payload).toString())
            // req.info
            // req.params
            // req.fingerprint
            // req.headers
            let resp = {
                timestamp: moment().format(),
                client: {},
                server: {
                    ip: request.info.address
                },
                request: {
                    tls: {}, // https info goes here
                    host: request.info.uri,
                    method: request.raw.req.method,
                    headers: request.raw.req.headers,
                    payload: {
                        length: request.payload.length,
                        md5: md5(request.payload),
                        base64: Buffer.from(request.payload).toString('base64')
                    }
                }
            };

            return h.response('got it').takeover().code(201);

            // return 'everything uploaded!'
            /*
            switch(proto){
                case 'redis':
                    // await redis.RPUSH(queue, ['test','ing']);
                    break;
                default:
                    // can't detect protocol so die
                    break;
            }
            */
        }
    });
    await server.start();

    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();