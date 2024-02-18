
const dev = process.env.NODE_ENV === 'development'

// import env
require('dotenv-flow').config({debug:dev});

function _launchServer() { 
	const port = process.env.PORT || 3000;
	// when using middleware `hostname` and `port` must be provided below
	// The HOST must be provided in the production env
	const hostname = process.env.HOST || 'localhost'
	const { start } = require('./server');
	const params = { isDev: dev, port,hostname };
	start(params);
}

_launchServer();





