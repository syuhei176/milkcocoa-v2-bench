var fs = require('fs');

var status_list = {};


function date() {
	var now = new Date();
	var y = now.getYear() + 1900;
	var m = now.getMonth() + 1;
	var d = now.getDate();
	return y + '-' + m + '-' + d;
}

function pub(topic, timestamp) {
	//console.log(status_list);
	if(!status_list.hasOwnProperty(topic)) status_list[topic] = {};
	status_list[topic][String(timestamp)] = {
		t: timestamp,
		ack: null,
		sub: null
	};
}

function pub_ack(topic, timestamp) {
	status_list[topic][String(timestamp)].ack = {
		delay: new Date().getTime() - timestamp
	};
}

function sub(topic, timestamp) {
	//console.log(topic, new Date(timestamp).toLocaleString());
	status_list[topic][String(timestamp)].sub = {
		delay: new Date().getTime() - timestamp
	};
}

/*
function restore() {
	var data = fs.readFileSync('./data.json');
	status_list = JSON.parse(data);
}

function store() {
	fs.writeFileSync('./data.json', JSON.stringify(status_list));
}
*/


function clear(status_list) {
	for(var topic in status_list) {
		for(var ts in status_list[topic]) {
			if(status_list[topic][ts].ack && status_list[topic][ts].sub) {
				delete status_list[topic][ts];
			}
		}
	}
	return status_list;
}

function summarize(status_list) {
	var summarize = {};
	for(var topic in status_list) {
		summarize[topic] = parse_status_list(topic, status_list[topic]);
	}
	return summarize;
	function parse_status_list(name, topic_status) {
		var topic = {
			name: name,
			topic_status: topic_status,
			timestamps: Object.keys(topic_status)
		}
		return topic.timestamps.map((ts) => {
			return topic.topic_status[ts]
		}).map((status) => {
			var ack_status = 0, sub_status = 0;
			if(status.t > (new Date().getTime() - 700)) {
				return {
					t: new Date(status.t).toLocaleString(),
					ack: 0,
					sub: 0
				}
			}
			if(status.ack && status.ack.delay < 200) {
				//blue
				ack_status = 1;
			}else if(status.ack && status.ack.delay < 4000) {
				//yellow
				ack_status = 2;
			}else{
				//red
				ack_status = 3;
			}
			if(status.sub && status.sub.delay < 250) {
				//blue
				sub_status = 1;
			}else if(status.sub) {
				//console.log(status);
				//yellow
				sub_status = 2;
			}else{
				//red
				sub_status = 3;
			}
			return {
				t: new Date(status.t).toLocaleString(),
				ack: ack_status,
				sub: sub_status
			}
		});
	}
}

function summarize2(summarize) {
	var summarize2 = {};
	for(var topic in summarize) {
		summarize2[topic] = parse_summarize(topic, summarize[topic]);
	}
	return summarize2;
	function parse_summarize(topic, topic_summarize) {
		return topic_summarize.reduce((acc, item) => {
			if(!acc.ack[item.ack]) acc.ack[item.ack] = 0;
			if(!acc.sub[item.sub]) acc.sub[item.sub] = 0;
			acc.ack[item.ack]++;
			acc.sub[item.sub]++;
			return acc;
		}, {ack:[0,0,0,0], sub:[0,0,0,0]});
	}
}

function getSummary() {
	var summary = summarize(status_list);
	var summary2 = summarize2(summary)
	console.log(summary2);
	status_list = clear(status_list);
	return summary2;
}

module.exports = {
	pub: pub,
	pub_ack: pub_ack,
	sub: sub,
	getSummary: getSummary
}