const { db,admin  } = require('../util/admin')
const firebase = require('firebase')
const config = require('../util/config')

firebase.initializeApp(config)
// console.log(config)


const isEmpty = (str) => {
    if (str.trim() === "" ) return true
    else return false

}

const isEmail = (email) => {

    const regEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false


}


exports.signup = (req,res)=>{


    // if (req.method !== 'POST')
    // {
    //     return res.status(400).json({error: "Method not allowed."})
    // }
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
        // createdAt: new Date().toISOString()
    }
    console.log(newUser)
    // return res.json({out:newScream})
    let noImg = 'no-img.png'

    let errors = {}

    if (isEmpty(newUser.email)){
        errors.email = "Cannot be empty"
    }
    else if (isEmail(newUser.email)===false){
        errors.email = "Please enter valid email address"
    }

    // }

    if (isEmpty(newUser.password ))
    {
        errors.password = "Cannot be empty"
    }
    else if (newUser.password !== newUser.confirmPassword) {
        errors.confirmPassword = "Passwords must match"

    }


    
    if (isEmpty(newUser.handle ))
    {
        errors.handle = "Cannot be empty"
    }

    console.log('validation errs here',errors)

    if (Object.keys(errors).length > 0)
    {
     return res.status(400).json(errors )   
    }

    let userId, token

    db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc=>{
        if (doc.exists){
            return res.status(400).json({handle:`${newUser.handle} is alreday tsaken.`})

        }
        else {
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email,newUser.password)
            

        }
    })
    .then(data=>{
        userId = data.user.uid


        return data.user.getIdToken()
    })
    .then(userToken=>{
        token = userToken

        return db.doc(`/users/${newUser.handle}`)
        .set({
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId,
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
        })

        // return res.status(201).json({token})
    })
    .then(data=>{
        return res.status(201).json({token})
    })
    .catch(err=>{
        return res.status(500).json({err: err.code})
    })




    
}

exports.login = (req,res)=>{

    const user = {
        email: req.body.email,
        password: req.body.password
    }
    console.log('passed 1')

    let errors = {}

    if (isEmpty(user.email))
        errors.email = "Cannot be empty"
    else if (!isEmail(user.email)){
        errors.email = "Not valid"
    }

    if (isEmpty(user.password))
    {
        errors.password = "Cannot be empty"
    }
    
    console.log(errors,'errs abve')

    if (Object.keys(errors).length > 0)
    {
        console.log('in if')
        return res.status(400).json(errors )   

        // return res.status(400).json(errors)
    }
    console.log('passed here')
    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
    .then(data=>{

        return data.user.getIdToken()
    })
    .then(idToken=>{
        return res.status(201).json({token: idToken})
    })
    .catch(err=>{
        console.log(err,'in catch earlier')
        if (err.code === 'auth/wrong-password')
        {
            // errors.password = 'password is wrong'
            return res.status(400).json({general: 'password is wrong' })
        }
        else return res.status(500).json({error:err.code})
    })
    

}

exports.uploadImage = (req,res) => {
    const BusBoy = require('busboy')
    const path = require('path')
    const os = require('os')
    const fs = require('fs')

    const busboy = new BusBoy({headers: req.headers})

    let imageFileName;
    let imageToBeUploaded = {}
    console.log('checkpoint 1')
    busboy.on('file', ( fieldname, file, filename, encoding, mimetype ) => {
        console.log('asdf',fieldname,filename,mimetype)

        if (mimetype !== 'image/jpeg' && mimetype!=="image/png")
        {
            res.status(400).json({'error':"Wrong file type submitted"})
        }
        const imageExtension = filename.split('.')[filename.split('.').length - 1]

         imageFileName = `${Math.round(Math.random()*10000000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);

        imageToBeUploaded = { filepath, mimetype }

        file.pipe(fs.createWriteStream(filepath));
    })
    console.log('checkpoint 2')

    busboy.on('finish',() => {

        console.log('checkpoint 3',config.storageBucket,imageToBeUploaded.filepath)

        admin.storage().bucket(config.storageBucket).upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                contentType: imageToBeUploaded.mimetype

            }
        })
        .then(()=>{
            console.log('checkpoint 4')

            // alt at end means show in browser rther than downloading
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
            return db.doc(`/users/${req.user.handle}`).update({imageUrl})

        })
        .then(()=>{
            return res.json({message: 'Image uploaded successfully.'})
        })
        .catch(err=>{
            console.log('err',err)
            return res.status(500).json({error: err.code})
        })
    })
// })


    busboy.end(req.rawBody)

}


// Get own user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          return db
            .collection("likes")
            .where("userHandle", "==", req.user.handle)
            .get();
        }
        return new Promise(function(){})
      })
      .then((data) => {
        userData.likes = [];
        data.forEach((doc) => {
          userData.likes.push(doc.data());
        });
        return db
          .collection("notifications")
          .where("recipient", "==", req.user.handle)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();
      })
      .then((data) => {
        userData.notifications = [];
        data.forEach((doc) => {
          userData.notifications.push({
            recipient: doc.data().recipient,
            sender: doc.data().sender,
            createdAt: doc.data().createdAt,
            screamId: doc.data().screamId,
            type: doc.data().type,
            read: doc.data().read,
            notificationId: doc.id,
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };

  // Add user details
exports.addUserDetails = (req, res) => {
    let userDetails ={}// reduceUserDetails(req.body);
  
    let data = req.body;

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    // https://website.com
    if (data.website.trim().substring(0, 4) !== 'http') {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }
  if (!isEmpty(data.location.trim())) userDetails.location = data.location;

    db.doc(`/users/${req.user.handle}`)
      .update(userDetails)
      .then(() => {
        return res.json({ message: "Details added successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };