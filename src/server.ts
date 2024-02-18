import express, { Express, NextFunction, Request, Response } from 'express';
import createError, { HttpError } from 'http-errors'
import bodyParser from 'body-parser';
import * as chrono from 'chrono-node';
import { Dayjs } from 'dayjs';
// import mongoose from "mongoose";

type ServerParam = {
	isDev?: boolean;
	port: number;
	hostname: string;
}

// export async function connectMongo() {
// 	const uri = process.env.WEB_APP_MONGO_URI || 'mongodb://127.0.0.1:27017/test';
// 	return mongoose.connect(uri);
// }

// this is just a demo, dont do this in the production unless you are sure you only have one dyno
interface ISessionData {
	session: string;
	timestamp: number;
	candidates: number[];
}
const RECENT_SESSIONS: Record<string,ISessionData> = {}

function humanFriendlyFormat(timestamp:number) {
	const d = new Dayjs(timestamp);
	return d.format('MMMM D, dddd, h A');				
}

/**
 * Start the express server 
 **/
export function server({ isDev = false, port, hostname }: ServerParam ) {

	const app: Express = express();
	// const uploader = multer();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: false}));
	
	app.get('/query_calendar', (req: Request, res: Response) => {
		
		const sessionId = req.headers['x-taalk-session'] as string;
		const startFrom = chrono.parseDate(req.query.start as string);

		console.log(`Query calendar for ${sessionId}, start from ${startFrom}`)

		if( startFrom ) {
			const session = {
				session: sessionId,
				timestamp: Date.now(),
				candidates: [
					startFrom.valueOf() + Math.ceil(Math.random()*7*24*3600)*1000,
					startFrom.valueOf() + Math.ceil(Math.random()*7*24*3600)*1000,
				]
			}
			RECENT_SESSIONS[sessionId] = session;
			// genreate some dates after this time;
			const payload = session.candidates.map(humanFriendlyFormat)

			console.log(`Candidates`)
			console.dir(payload);

			return res.json({ payload })
		} else {
			throw new createError.BadRequest('Must have a range');
		}
	});

	app.post('/make_appointment', (req: Request, res: Response) => {
		const sessionId = req.headers['x-taalk-session'] as string;
		const raw = req.body.date as string;
		const date = chrono.parseDate(raw);
		console.log(`Make appointment for ${sessionId}, at ${raw}(${date})`);
		const s =	RECENT_SESSIONS[sessionId];
		if( !s ) {
			throw new createError.BadRequest('Unknown session');
		}
		

		let closest;
		if( date ) {
			// find the closest 
			const input = date.valueOf();
			let min = Infinity;
			for( let d of s.candidates ) {
				const dist = Math.abs(d-input);
				if( dist < min ) {
					closest = d;
				}
			}			
		} else {
			const low = raw.toLowerCase();
			let idx;
			if( low.indexOf('first') !== -1 ) {
				idx = 0;
			} else if( low.indexOf('second') !== -1 ) {
				idx = 1;
			} else if( low.indexOf('last') !== -1 ) {
				idx = s.candidates.length-1;
			}
			closest = s.candidates[idx];
			// throw new createError.BadRequest('Must have a date');
		}

		if( undefined === closest ) {
			const payload = humanFriendlyFormat(closest);
			return res.json({payload});
		} else {
			throw new createError.InternalServerError('no candidates');
		}

	});


	// app.post('/upload', uploader.single('file'), onUploadKBFile );
		
	// production error handler
	// no stacktraces leaked to user
	app.use((err:HttpError, req:Request, res:Response, next:NextFunction)=>{
		res.status(err.status || 500);
		res.send(err.message);
		// res.render('error', {
		// 	message: err.message,
		// 	error: (app.get('env') === 'development') ? err : {},
		// });
	});

	// catch 404 and forward to error handler
	app.use((req: Request, res, next) => {
		next(createError.NotFound);
	});


	app.listen(port, () => {
		console.log(`⚡️[server]: Server is running at http://${hostname}:${port}`);
	});
	
}


export async function start(params:ServerParam) {
	// await connectMongo();
	server(params);
}