const express = require('express');
const app = express();
const child_process = require("child_process");
const mqtt = require('mqtt');
const settings = require('./settings');

var workers = [];
var last_pub_message = {};
var last_sub_message = {};

function create_mqtt_option() {
    return {
        username: 'k' + settings.app.apiKey,
        clientId: 'metrics',
        password: settings.app.appId,
        protocolId : 'MQTT',
        protocolVersion: 4,
        reconnectPeriod: 7000
    }
}
var client = mqtt.connect(
    settings.url,
    create_mqtt_option()
);

var prefix_str = process.argv[2] || 'local'
var prefix = prefix_str + '-';

create_workers(1, 'pub.js');
create_workers(1, 'sub.js');

function create_workers(num, file) {

	create_workers_part(1, num, file);

	function create_workers_part(index, max, file) {
		if(index > max) return;
		create_worker(String(index), file);
		setTimeout(function() {
			create_workers_part(index + 1, max, file);
		}, 10000);
	}
}

function create_worker(workerId, file) {
	var worker = child_process.fork(__dirname + "/" + file, [prefix+ 'bench' + workerId]);
	worker.on('message', function(message) {
		if(message.type == 'pub') {
			last_pub_message[message.topic] = message.data;
			last_pub_message[message.topic].created = new Date().toLocaleString();
			client.publish(settings.appId + '/metrics_pub_'+message.topic+'/_p', JSON.stringify(message.data))
		}else if(message.type == 'sub') {
			last_sub_message[message.topic] = message.data;
			last_sub_message[message.topic].created = new Date().toLocaleString();
			client.publish(settings.appId + '/metrics_sub_'+message.topic+'/_p', JSON.stringify(message.data))
		}
	});
	worker.on('exit', function(e) {
		console.error('exit ' + file, e);
		setTimeout(function() {
			create_worker(workerId, file);
		}, Math.floor(Math.random()*1000));
	});
	workers.push(worker);
}

function kill_all() {
	workers.forEach(function(w) {
		w.disconnect();
		w.kill();
	});
}

app.get('/', function(req, res) {
	res.json({
		last_pub_message: last_pub_message,
		last_sub_message: last_sub_message
	});
});

app.listen(3000);

process.on('uncaughtException', (err) => {
	console.error('uncaughtException', err);
});
