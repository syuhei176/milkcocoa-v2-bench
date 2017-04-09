const Milkcocoa = require('mlkcca-js');
const settings = require('./settings');

var topic = process.argv[2];

var pub_count = {}, puback_count = {};

console.log("pub.js", topic, "start");

setInterval(function() {
	for(var key in pub_count) {
		console.log(key, pub_count[key], puback_count[key], new Date().toLocaleString());
		process.send({topic:key, type:'pub', data:{pub_count:pub_count[key], puback_count:puback_count[key]}});
		pub_count[key] = 0;
		puback_count[key] = 0;
	}
}, 10000);

create_clients(10);

function create_mqtt_option(id) {
    return {
        username: 'k' + settings.apiKey,
        clientId: topic + id,
        password: settings.appId,
        protocolId : 'MQTT',
        protocolVersion: 4,
        reconnectPeriod: 7000
    }
}

function create_clients(clients) {
	if(clients <= 0) return;
	create_client(clients);
	setTimeout(function() {
		create_clients(clients - 1);
	}, 100);
}

function create_client(id) {
	var milkcocoaConfig = Object.assign({}, settings.app, {
	    uuid: topic + id
	})

	var milkcocoa = new Milkcocoa(milkcocoaConfig);

	setTimeout(function() {
		publish_loop(milkcocoa, topic + '-' + id);
	}, 1000);
}

function publish_loop(milkcocoa, topic) {
	setTimeout(function() {
		publish(milkcocoa, topic, function() {
			if(puback_count[topic] === undefined) puback_count[topic] = 0;
			puback_count[topic]++;
		});
		publish_loop(milkcocoa, topic);
	}, settings.span);
}

function publish(milkcocoa, topic, cb) {
	var ts = new Date().getTime();
	if(pub_count[topic] === undefined) pub_count[topic] = 0;
	pub_count[topic]++;

	milkcocoa.dataStore(topic).push({ts:ts,data:make_data()}, cb);
}

function make_data() {
	function str() {
		var str = '';
		for(var i=0;i < 500;i++) {
			str += String(i%10);
		}
		return str;
	}
	function num() {
		return Math.random() * 100000;
	}
	return {
		value_1: str(),
		value_2: num(),
		value_3: str(),
		value_4: num(),
		value_5: str(),
		value_6: num(),
		value_7: num()
	}
}