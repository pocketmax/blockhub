class MyError extends Error {
    constructor(args){
        super(args);
        this.field = args.field
    }
}

module.exports = MyError