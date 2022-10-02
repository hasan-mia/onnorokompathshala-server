const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

// Port
const port = process.env.PORT || 5001

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tsmuzfz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//==============================//
//			Tokeyn Verify		//
//==============================//
function verifyJWT(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).send({
			message: 'UnAuthorized access'
		});
	}
	const token = authHeader.split(' ')[1];
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
		if (err) {
			return res.status(403).send({
				message: 'Forbidden access'
			})
		}
		req.decoded = decoded;
		next();
	});
}

// ===============All API==============
async function run() {
	try {
		client.connect();
		console.log('DB Connected');
		const userCollection = client.db("onnorokompathshala").collection("users");
		const videoCollection = client.db("onnorokompathshala").collection("videos");

		//==============================//
		//			User Controller		//
		//==============================//

		// ===Create Token by Email and Save Data into Server===
		app.put('/login/:email', async (req, res) => {
			const email = req.params.email;
			const user = req.body;
			const filter = { email: email };
			const options = { upsert: true };
			const updateUser = {
				$set: { ...user },
			};
			const result = await userCollection.updateOne(filter, updateUser, options);
			const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, /*{ expiresIn: '1h' }*/)
			res.send({ result, token });

		})

		// ====Update User Profile ======
		app.put('/user/:email', async (req, res) => {
			// const id = req.params.id;
			const email = req.params.email;
			const user = req.body;
			// const filter = {_id: ObjectId(id)};
			const filter = { email: email };
			const options = { upsert: true };
			const updateUser = {
				$set: {
					name: user.name,
					facebook: user.facebook,
					img: user.img
				}
			};
			const result = await userCollection.updateOne(filter, updateUser, options);
			res.send(result);
		});

		// Get All Users
		app.get('/users', async (req, res) => {
			const query = {};
			const cursor = userCollection.find(query);
			const users = await cursor.toArray();
			res.send(users);
		});

		// Get User by email
		app.get("/myprofile", verifyJWT, async (req, res) => {
			const tokenInfo = req.headers.authorization;
			const [email, accessToken] = tokenInfo.split(" ")
			const decodedEmail = req.decoded.email;
			if (email === decodedEmail) {
				const myprofile = await userCollection.find({ email: email }).toArray();
				res.send(myprofile);
			}
			else {
				return res.status(403).send({ success: 'Forbidden Access' })
			}
		})


		//==============================//
		//		Video Controller		//
		//==============================//

		// ====Add Video======
		app.post('/video', async (req, res) => {
			const video = req.body;
			const result = await videoCollection.insertOne(video);
			res.send(result);
		});

		// ====Get Videos======
		app.get('/videos', async (req, res) => {
			const query = {};
			const cursor = videoCollection.find(query);
			const videos = await cursor.toArray();
			res.send(videos);
		});

		// ====Get Single Videos======
		app.get('/video/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const video = await videoCollection.findOne(query);
			res.send(video);
		})

		// ====Update Likes======
		app.put('/video/:videoId/like', async (req, res) => {
			const video = req.body;
			const result = await videoCollection.updateOne(
				{ videoId: video.videoId },
				{ $push: { likes: video.likes } }
			 )
			res.send(result);
			// console.log(video)
		});

		// ====Update Dislikes======
		app.put('/video/:videoId/dislike', async (req, res) => {
			const video = req.body;
			const result = await videoCollection.updateOne(
				{ videoId: video.videoId },
				{ $push: { dislikes: video.dislikes } }
			 )
			res.send(result);
			// console.log(video)
		});

		// ====Update Videos======
		app.put('/video/:id', async (req, res) => {
			const id = req.params.id;
			const video = req.body;
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updateVideo = {
				$set: {
					title: video.title,
					description: video.description,
					videoId: video.videoId,
					apiKey: video.apiKey,
				}
			};
			const result = await videoCollection.updateOne(filter, updateVideo, options);
			res.send(result);
		});

		// ====Delete Videos======
		app.delete('/video/:id', async (req, res) => {
			const id = req.params.id;
			const videoId = { _id: ObjectId(id) };
			const result = await videoCollection.deleteOne(videoId);
			res.send(result);
		});


	} catch (error) {
		res.send(error);
	}
}
run().catch(console.dir)


app.get('/', (req, res) => {
	res.send('Onnorokom Pathshala Server is Running')
})

app.listen(port, () => {
	console.log(`Onnorokom Pathshala listening on port ${port}`)
})