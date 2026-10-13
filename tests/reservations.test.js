const assert=require('node:assert/strict');const{once}=require('node:events');const{before,after,test}=require('node:test');
const app=require('../src/app');const db=require('../src/config/db');let server,base;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));await db.end();});
const valid={show_id:3,guest_name:'Garnet Guest',phone_number:'0812345678',zone:'Front Stage',table_number:'F01',date:'2026-10-16',time:'20:00'};
const write=(method,path,body)=>fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

function connection(handler){return{beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){},execute:handler};}

test('POST reservation saves customer, table, show and date-time in one transaction',async t=>{
 const calls=[];t.mock.method(db,'getConnection',async()=>connection(async(sql,values)=>{calls.push([sql,values]);if(sql.includes('FROM shows'))return[[{show_id:3,performance_date:'2026-10-16',start_time:'20:00'}]];if(sql.includes('FROM club_tables'))return[[{table_id:'F01'}]];if(sql.includes('INSERT INTO customers'))return[{insertId:8}];if(sql.includes('INSERT INTO reservations'))return[{insertId:12}];throw Error(sql);}));
 const res=await write('POST','/api/reservations',valid);assert.equal(res.status,201);const body=await res.json();assert.equal(body.data.show_id,3);assert.equal(body.data.id,12);
 const insert=calls.find(([sql])=>sql.includes('INSERT INTO reservations'));assert.deepEqual(insert[1],[8,'F01',3,'2026-10-16 20:00:00']);
});

test('reservation validation requires a show and approved time',async()=>{
 for(const body of [{...valid,show_id:''},{...valid,time:'19:00'},{...valid,table_number:'X99'}]){const res=await write('POST','/api/reservations',body);assert.equal(res.status,400);}
});

test('reservation rejects a date/time that does not match the selected show',async t=>{
 t.mock.method(db,'getConnection',async()=>connection(async sql=>sql.includes('FROM shows')?[[{show_id:3,performance_date:'2026-10-17',start_time:'20:00'}]]:[[]]));
 const res=await write('POST','/api/reservations',valid);assert.equal(res.status,409);assert.equal((await res.json()).error.code,'SHOW_TIME_MISMATCH');
});

test('GET reservations returns joined show details and status',async t=>{
 t.mock.method(db,'execute',async sql=>{assert.match(sql,/JOIN shows s ON s\.show_id = r\.show_id/);return[[{id:1,show_id:3,guest_name:'Mary',phone_number:'0800000000',zone:'Front Stage',table_number:'F01',artist_name:'Nina & The Brass',date:'2026-10-16',time:'20:00',status:'confirmed'}]];});
 const res=await fetch(base+'/api/reservations');assert.equal(res.status,200);const body=await res.json();assert.equal(body.data[0].artist_name,'Nina & The Brass');assert.equal(body.data[0].show_id,3);
});

test('availability excludes active bookings and ignores cancelled/no-show through SQL',async t=>{
 t.mock.method(db,'execute',async(sql,values)=>{assert.match(sql,/NOT IN \('cancelled', 'no-show'\)/);assert.deepEqual(values,['2026-10-16','20:00']);return[[{table_number:'F01'}]];});
 const res=await fetch(base+'/api/reservations/availability?date=2026-10-16&time=20%3A00');assert.deepEqual((await res.json()).data.booked_tables,['F01']);
});

test('PUT checks show/table references and DELETE uses a bound reservation ID',async t=>{
 const calls=[];t.mock.method(db,'getConnection',async()=>connection(async(sql,values)=>{calls.push([sql,values]);if(sql.includes('SELECT reservation_id'))return[[{reservation_id:4}]];if(sql.includes('FROM shows'))return[[{show_id:3,performance_date:'2026-10-16',start_time:'20:00'}]];if(sql.includes('FROM club_tables'))return[[{table_id:'F01'}]];if(sql.includes('INSERT INTO customers'))return[{insertId:8}];if(sql.includes('UPDATE reservations'))return[{affectedRows:1}];throw Error(sql);}));
 let res=await write('PUT','/api/reservations/4',valid);assert.equal(res.status,200);assert.match(calls.find(([s])=>s.includes('UPDATE reservations'))[0],/show_id = \?/);
 db.getConnection.mock.restore();t.mock.method(db,'execute',async(sql,values)=>{assert.equal(sql,'DELETE FROM reservations WHERE reservation_id = ?');assert.deepEqual(values,[4]);return[{affectedRows:1}];});res=await fetch(base+'/api/reservations/4',{method:'DELETE'});assert.equal(res.status,204);
});
