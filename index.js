const express = require('express');
const app = express();
const child_process = require("child_process");
const mqtt = require('mqtt');
const settings = require('./settings');
const status = require('./status');

var workers = [];
var last_pub_message = {};
var last_sub_message = {};
var latest_status = {};

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

var num_process = Number(process.argv[3] || '1');

setTimeout(function() {
	create_workers(num_process, 'pub.js');
}, 5000);

create_workers(num_process, 'sub.js');

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
			status.pub(message.topic, message.ts);
		}else if(message.type == 'ack') {
			status.pub_ack(message.topic, message.ts);
		}else if(message.type == 'sub') {
			status.sub(message.topic, message.ts);
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
		ts: new Date().getLocaleString(),
		latest_status: latest_status
	});
});

app.listen(3001);

process.on('uncaughtException', (err) => {
	console.error('uncaughtException', err);
});

setInterval(function() {
	let current = status.getSummary();
	let result = diff(current);
	console.log(current, result);
	client.publish(settings.app.appId + '/'+prefix+'metrics/_p', JSON.stringify(result))
	latest_status = current;
}, 10000);

function diff(current) {
	var result = {};
	for(var topic in current) {
		if(latest_status[topic]) {
			result[topic] = {
				a_s: current[topic].ack[1],
				a_w: current[topic].ack[2],
				a_e: current[topic].ack[3] - (latest_status[topic].ack[3]||0),
				s_s: current[topic].sub[1],
				s_w: current[topic].sub[2],
				s_e: current[topic].sub[3] - (latest_status[topic].sub[3]||0)
			}
		}
	}
	return result;
}

