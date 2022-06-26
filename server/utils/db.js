const { Pool } = require('pg')

const pool = new Pool({
    user: 'izjqfiup',
    host: 'rogue.db.elephantsql.com',
    database: 'izjqfiup',
    password: 'ikwSRydveZtZ2B3sINAJPFnpxAPOsBgr',
    port: 5432,
    max : 100,
    idleTimeoutMillis: 30000
});


module.exports = {
    query: (text, params, callback) => {
        return pool.query(text, params, callback)
    }
}