const { Client } = require('pg'); 
const client = new Client({ user: 'postgres', host: 'localhost', database: 'techstorepos_db', password: '572128', port: 5432 }); 
client.connect().then(async () => { 
  const res = await client.query("SELECT id, name, category_id FROM products"); 
  console.log('Products:', res.rows); 
  await client.end(); 
}).catch(console.error);
