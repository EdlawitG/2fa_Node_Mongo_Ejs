const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      require: true,
    },
    secret: {
      type: String,
    },
    is_2fa_enabled:{
      type : Boolean ,  default : false
    }
  },
  {
    timestamps: true,
  }
);

const Users = mongoose.model("Users", userSchema);

module.exports = Users;
