const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;
var admin = require("firebase-admin");
const FieldValue = admin.firestore.FieldValue;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


var server = app.listen(PORT, () => {
	console.log('app listen on port '+PORT)
})

const io = require('socket.io')(server);

io.on('connection', (socket) => {

	socket.on('SEND_MESSAGE', (data) => {
		let rooms = Object.keys(socket.rooms);
		console.log(rooms[1]);
		io.to(rooms[1]).emit('MESSAGE',data)
	})

	socket.on("newRoom", (mychannel) => {
		socket.join(mychannel)
	})

	socket.on('typing', (data) => {
		socket.broadcast.emit('typing', data)
	})

	socket.on('stopTyping', (data) => {
		socket.broadcast.emit('stopTyping', data)
	})

	// socket.on('disconnect', () => {
	// 	console.log('sedak tidak online')
	// })

	// socket.on('joined', (data) => {
	// 	socket.broadcast.emit('joined', data)
	// })
})

var serviceAccount = require("./udara-5e09a-firebase-adminsdk-pxdwh-6c78877dc7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://udara-5e09a.firebaseio.com"
});

var db = admin.firestore();
db.settings({timestampsInSnapshots: true})

var users = db.collection('users');
var messages = db.collection('messages');
var chats = db.collection('chats');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.get('/users', (req, res) => {
	var userData;
	var userArr = [];

	users.get()
	.then(snapshot => {
		snapshot.forEach(doc => {
			console.log(doc.id, '=>', doc.data());
			userData = {
				id: doc.id,
				data: doc.data()
			}
			userArr.push(userData)
		});
		res.status(200).json(userArr)
	})
	.catch(err => {
		console.log('Error getting documents', err);
	});
})

app.get('/user/:id', (req, res) => {
	users.doc(req.params.id).get()
	.then(doc => {
		var data = {
			data: doc.data(),
			id: doc.id
		}
		res.status(200).json(data)
	})
	.catch(err => {
		console.log('Error getting document', err);
	});
})

app.post('/join', (req, res) => {
	bcrypt.genSalt(10, (err, salt) => {
		bcrypt.hash(req.body.password, salt, (err, hash) => {
			users.add({
				about: "Hallo, Saya di Udara",
				fullname: req.body.fullname,
				username: req.body.username,
				email: req.body.email,
				password: hash
			}).then(ref => {
				res.status(200).json({
					message: 'terdaftar'
				})
				console.log('Added document with ID: ', ref.id);
			});
		})
	})
})

app.post('/login', (req, res) => {
	const reqUsername = req.body.username;
	const reqPassword = req.body.password;
	var userExist;
	var passwordExist;
	var account = users.where('username', '==', reqUsername)

	account.get().then(snapshot => {
		snapshot.forEach(doc => {
			userId = doc.id;
			userExist = doc.data().username;
			passwordExist = doc.data().password;
		})
		bcrypt.compare(reqPassword, passwordExist, (err, result) => {
			if(result) {
				var token = jwt.sign({id: userId}, 'secret', {
					expiresIn: '24h'
				});
				res.status(200).json({
					message: 'login berhasil',
					token: token,
					id: userId
				})
			} else {
				res.status(404).json({
					message: 'user tidak ada'
				})
			}
		})
	})
	.catch(err => {
		console.log('Error getting documents', err)
	});
})

// app.get('/messages/:id', (req, res) => {
// 	var messageData;
// 	var messageArr = [];

// 	messages.orderBy("timestamp", "desc").get()
// 	.then(snapshot => {
// 		snapshot.forEach(doc => {
// 			console.log(doc.id, '=>', doc.data());
// 			messageData = {
// 				id: doc.id,
// 				data: doc.data()
// 			}
// 			messageArr.push(messageData)
// 		});
// 		res.status(200).json(messageArr)
// 	})
// 	.catch(err => {
// 		console.log('Error getting documents', err);
// 	});
// })

app.get('/messages/:id', (req, res) => {
	var reqIdPenerima = req.params.id;
	var messageData;
	var messageArr = [];
	var query = messages.where('idpenerima', '==', reqIdPenerima)

	query.get()
	.then(doc => {
	    if (!doc.exists) {
	    	console.log('No such document!');
	    } else {
	    	console.log('Document data:', doc.data());
	    	res.status(200).json(doc.data())
	    }
	})
	.catch(err => {
		console.log('Error getting document', err);
	});
})

app.get('/chats/', (req, res) => {
	chats.get()
	.then(doc => {
	    if (!doc.exists) {
	    	console.log('No such document!');
	    } else {
	    	console.log('Document data:', doc.data());
	    	res.status(200).json(doc.data())
	    }
	})
	.catch(err => {
		console.log('Error getting document', err);
	});
})


// app.get('/conversation/:id', (req, res) => {
// 	var convData;
// 	var convArr = [];
// 	var params = req.params.id;
// 	var conv = messages.where('idpenerima', '==', params)

// 	conv.orderBy("timestamp", "desc").get()
// 	.then(snapshot => {
// 		snapshot.forEach(doc => {
// 			console.log(doc.id, '=>', doc.data());
// 			convData = {
// 				id: doc.id,
// 				data: doc.data()
// 			}
// 			convArr.push(convData)
// 		});
// 		res.status(200).json(convArr)
// 	})
// 	.catch(err => {
// 		console.log('Error getting documents', err);
// 	});
// })

// app.get('/conversation/reply/:id', (req, res) => {
// 	var convData;
// 	var convArr = [];
// 	var params = req.params.id;
// 	var conv = messages.where('idpengirim', '==', params)

// 	conv.orderBy("timestamp", "desc").get()
// 	.then(snapshot => {
// 		snapshot.forEach(doc => {
// 			console.log(doc.id, '=>', doc.data());
// 			convData = {
// 				id: doc.id,
// 				data: doc.data()
// 			}
// 			convArr.push(convData)
// 		});
// 		res.status(200).json(convArr)
// 	})
// 	.catch(err => {
// 		console.log('Error getting documents', err);
// 	});
// })

app.post('/message', (req, res) => {
	messages.add({
		timestamp: FieldValue.serverTimestamp(),
		idpenerima: req.body.idpenerima,
		idpengirim: req.body.idpengirim,
		pesan: req.body.pesan
	}).then(ref => {
		res.status(200).json({
			message: 'terkirim'
		})
		console.log('Added document with ID: ', ref.id);
	});
})