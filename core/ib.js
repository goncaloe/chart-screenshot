const { Client, Contract } = require('ib-tws-api');


/**
 * Create a new contract stock
 * @param {*} symbol 
 */
Client.prototype.contractStock = function(symbol){
    return Contract.stock(symbol);
}

const ib = new Client({
    host: '127.0.0.1',
    port: 7497
});

module.exports = ib;