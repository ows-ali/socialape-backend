const admin = require('firebase-admin')

admin.initializeApp(
    {
  credential: admin.credential.cert(require("../keys/serviceAccountKey.json")),
  databaseURL: "https://socialape-93f08.firebaseio.com"
}
);

const db = admin.firestore()

module.exports = { admin, db }

