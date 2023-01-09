'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, before, describe, it, test } = exports.lab = Lab.script();
// const { init, start } = require('../../blockstoreapi');
const md5 = require('md5')

const hashGood = '20f4731780c2cabbfa13128ced58ba43'
const hashBadLen = '731780c2cabbfa13128ced58ba43'
const hashBadChar = 'Zb8bd503bc96e553c0aed9f074621711'

describe('stages a checksum to a chain', () => {

    // expect(resWrite.statusCode).to.equal(201);
    it(`fails with an invalid char in chain id`, async () => {
        expect(1).to.equal(2)
    });
    it(`fails with an invalid length in chain id`, async () => {
        expect(1).to.equal(1)
    });
    it(`fails with an invalid char in checksum`, async () => {
        expect(1).to.equal(1)
    });
    it(`fails with an invalid length in checksum`, async () => {
        expect(1).to.equal(1)
    });

    it(`passes with a valid checksum and chain id`, async () => {
        expect(1).to.equal(1)
    });

});
