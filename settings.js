module.exports = {
	// publish span in msec
	span: 500,
	url: 'mqtts://pubsub1.mlkcca.com:8883',
	app: {
		appId: process.env.MILKCOCOA_APP_ID,
		apiKey: process.env.MILKCOCOA_APP_APIKEY
	}
}
