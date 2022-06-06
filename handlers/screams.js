const { db, admin } = require('../util/admin')

exports.getAllScreams = (req,res) => {
    admin.firestore()
    .collection('screams')
    .orderBy('createdAt','desc')
    .get()
    .then(data => {
        // console.log(data)
        let screams = []
        data.forEach(doc=>{
              screams.push({
                screamId: doc.id,
                userHandle: doc.data().userHandle,
                body:doc.data().body,
                createdAt:doc.data().createdAt,
                userImage: doc.data().userImage,                        
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount
              })
        })
        // console.log(screams,'screams')
 
        return res.json(screams)
    })
    .catch(err=>console.error(err))
}

exports.postOneScream =(req,res)=>{
    
    
    // if (req.method !== 'POST')
    // {
    //     return res.status(400).json({error: "Method not allowed."})
    // }
    console.log('in posot scream',req.body)
    // console.log(req.body)
    if (req.body.body.trim()==='')
    {
        return res.status(400).json({body: "Cannot be empty"})
    }
    console.log('new user scream',req.user)
    console.log('new user scream',req.user.imageUrl)

    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        userImage: req.body.imageUrl,
        likeCount: 0,
        commentCount: 0
    }

    admin.firestore()
    .collection('screams')
    .add(newScream)
    .then(doc=>{
        // return res.json({message: `document ${doc.id} created successfully`})
        const resScream = newScream;
      resScream.screamId = doc.id;
      return res.json(resScream);
    })
    .catch(err=>{
        res.status(500).json({error:"Something went wrong: " + err})
        console.log(err)
    })
}

// Fetch one scream
exports.getScream = (req, res) => {
    let screamData = {};
    db.doc(`/screams/${req.params.screamId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return db
          .collection('comments')
          .orderBy('createdAt', 'desc')
          .where('screamId', '==', req.params.screamId)
          .get();
      })
      .then((data) => {
        screamData.comments = [];
        data.forEach((doc) => {
          screamData.comments.push(doc.data());
        });
        return res.json(screamData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };


  // Like a scream
exports.likeScream = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('screamId', '==', req.params.screamId)
      .limit(1);
  
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);
  
    let screamData;
  
    screamDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          screamData = doc.data();
          screamData.screamId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Scream not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection('likes')
            .add({
              screamId: req.params.screamId,
              userHandle: req.user.handle
            })
            .then(() => {
              screamData.likeCount++;
              return screamDocument.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
              return res.json(screamData);
            });
        } else {
          return res.status(400).json({ error: 'Scream already liked' });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };

  
// Delete a scream
exports.deleteScream = (req, res) => {
    const document = db.doc(`/screams/${req.params.screamId}`);
    document
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        if (doc.data().userHandle !== req.user.handle) {
          return res.status(403).json({ error: 'Unauthorized' });
        } else {
          return document.delete();
        }
      })
      .then(() => {
        return res.json({ message: 'Scream deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };

  exports.commentOnScream = (req, res) => {
    if (req.body.body.trim() === '')
      return res.status(400).json({ comment: 'Must not be empty' });
  
    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      screamId: req.params.screamId,
      userHandle: req.user.handle,
      userImage: req.user.imageUrl
    };
    console.log(newComment);
  
    db.doc(`/screams/${req.params.screamId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      })
      .then(() => {
        return db.collection('comments').add(newComment);
      })
      .then(() => {
        return res.json(newComment);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  };