const { admin, db } = require('./admin')
module.exports = (req, res, next) => {

    let idToken ;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer "))
    {
        idToken = req.headers.authorization.split('Bearer ')[1]

    }
    else {
        console.log('no token found')
        return res.status(403).json({error: "Unauthorized"})
    }

    admin.auth().verifyIdToken(idToken)
    .then(decodedToken=>{
        console.log('decoded tkn starts',decodedToken,'decoded token')
        console.log(decodedToken.uid)

        req.user = decodedToken

        return db.collection('users')
        .where('userId','==',req.user.uid)
        .limit(1)
        .get()
    })
    .then(data=>{
        // console.log('in data',data,'in data abve')
        req.user.handle=data.docs[0].data().handle
        req.user.imageUrl = data.docs[0].data().imageUrl;
        return next()

    })
    .catch(err=>{
        console.error("Error while verifying token: ",err)
        return res.status(403).json(err)
    })

}