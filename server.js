const express = require("express");
const mongoose = require("mongoose");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const expressEjsLayouts = require("express-ejs-layouts");
const Users = require("./models/users");
const app = express();
require("dotenv").config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(expressEjsLayouts);

app.set("view engine", "ejs");
app.get("/private", (req, res) => {
  res.send("Hello Private Page");
});
app.get("/", (req, res) => {
  res.render("signup.ejs");
});
app.get("/login", (req, res) => {
  res.render("login.ejs");
});
app.post("/2fa-enable/:id", async (req, res) => {
  const secret = speakeasy.generateSecret();
  const email = req.body.email;
  const id = req.params.id;
  const user1 = await Users.findByIdAndUpdate(id, {
    email: email,
    secret: secret.base32,
    is_2fa_enabled: true,
  }).exec();
  if (!user1) {
    return res.status(400).json({ message: "Invalid Email can not update" });
  } else {
    QRCode.toDataURL(secret.otpauth_url, (err, image_data) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      }
      req.qr = image_data;
      return res.render("2fa-code.ejs", {
        qr: req.qr,
        user: user1,
        userEmail: email,
      });
    });
  }
});

app.post("/sign-up", (req, res) => {
  const user = new Users({ email: req.body.email });
  try {
    if (req.body.email == "") {
      return res.send("Email is required");
    }
    res.redirect("/login");
    user.save();
  } catch (err) {
    console.log(err);
  }
});
app.post("/login", (req, res) => {
  const { email } = req.body;
  Users.findOne({ email }).then((user) => {
    if (!user) {
      return res.status(400).json({ message: "Invalid Email" });
    } else {
      if (user.is_2fa_enabled == true) {
        return res.render("2fa-code.ejs", {
          user: user,
          userEmail: email,
        });
      } else {
        res.render("home.ejs", { userEmail: email, ID: user._id, user: user });
      }
    }
  });
});

// Verify a token with Google Authenticator
app.post("/verify", async function verifyToken(request, response) {
  const { email, code } = request.body;
  // console.log(email);
  Users.findOne({ email })
    .then((user) => {
      if (user) {
        // Access the email property of the user object
        const userSecret = user.secret;
        console.log(userSecret);
        var otpResult = speakeasy.totp.verify({
          secret: userSecret,
          encoding: "base32",
          token: code,
          window: 1,
        });
        if (otpResult) {
          // Token is valid
          console.log("Token is valid");
          response.redirect("/private");
        } else {
          // Token is invalid
          console.log("Token is invalid");
          return response.status(422).send({ message: "Invalid Code" });
        }
      } else {
        return response.status(400).json({ message: "Invalid Email" });
      }
    })
    .catch((error) => {
      console.error(error);
      return response.status(500).send({ message: "Internal Server Error" });
    });
});

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log("Connected to DB");
    app.listen(process.env.PORT, () => {
      console.log(`server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
