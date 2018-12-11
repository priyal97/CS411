// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  name: String,
 // username: { type: String, required: true, unique: true },
 // password: { type: String, required: true },
 // admin: Boolean,
 // location: String,
 // meta: {
 //   age: Number,
 //   website: String
 // },
  city:String,
  weather:String
 // zip:String,
 // created_at: Date,
 // updated_at: Date
});

var User = mongoose.model('User', userSchema);
module.exports = User;


/* Example Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let ProductSchema = new Schema({
    name: {type: String, required: true, max: 100},
    price: {type: Number, required: true},
});


// Export the model
module.exports = mongoose.model('Product', ProductSchema);

*/
