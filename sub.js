const Milkcocoa = require('mlkcca');
const settings = require('./settings');

var topic = process.argv[2];

var recv_count = {}, recv_times = {};

console.log("sub.js", topic, "start");

setInterval(function() {
	//console.log('sub', recv_count)
	try{
	for(var key in recv_count) {
		var avg = recv_times[key].reduce(function(acc, d) {return acc + d}, 0) / recv_times[key].length;
		//console.log(topic+'-'+key, "sub", recv_count[key], avg);
		//process.send({topic:topic+'-'+key, type:'sub', data:{recv_count:recv_count[key], avg:avg}});
		recv_count[key] = 0;
		recv_times[key] = [];
	}
	}catch(e){
		console.log(e);
	}
}, 10000);

var milkcocoaConfig = Object.assign({}, settings.app, {
    uuid: topic + '-sub'
})
var milkcocoa = new Milkcocoa(milkcocoaConfig);

create_clients(milkcocoa, 10);



function create_clients(milkcocoa, clients) {
	if(clients <= 0) return;
	create_client(milkcocoa, clients);
	setTimeout(function() {
		create_clients(milkcocoa, clients - 1);
	}, 200);
}

function create_client(milkcocoa, id) {
	console.log(topic + '-' + id)
	var ds = milkcocoa.dataStore(topic + '-' + id);
	var pre_count = 0;
	ds.on('push', function(e) {
        var start = e.value.ts;
		var count = e.value.c;
		//console.log(count);
		process.send({type:'sub', topic:topic + '-' + id, ts: start});
		pre_count = count;
        var end = new Date().getTime();
        if(recv_times[id] === undefined) recv_times[id] = [];
        if(recv_count[id] === undefined) recv_count[id] = 0;
        recv_times[id].push(end - start);
        recv_count[id]++;
	});

}
