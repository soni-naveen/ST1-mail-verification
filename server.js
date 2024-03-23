const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Student = require("./models/Student.js");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const cors = require("cors");
const nodemailer = require("nodemailer");
const app = express();

mongoose.connect("mongodb://127.0.0.1:27017/StudentsApi");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "Please give full number",
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 1000 * 60 * 15,
    },
  })
);
app.use(express.static(path.join(__dirname, "./views")));

// ================================ OTP generator
function generateRandomToken() {
  return Math.floor(Math.random() * 9000 + 1000);
}

//================================= Nodemailer setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  secure: true,
  service: "gmail",
  auth: {
    user: "ecoride.in@gmail.com",
    pass: "",
  },
});

// ================================ Send Verification Email
const BASE_URL = "http://localhost:3000";
function sendVerificationEmail(email, verificationToken) {
  const verificationLink = `${BASE_URL}/verify?email=${email}&token=${verificationToken}`;
  const mailOptions = {
    from: {
      name: "EcoRide",
      address: "ecoride.in@gmail.com",
    },
    to: email,
    subject: "Account Verification",
    html: `
    <h4>
    Click the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a>
    <p>Or Enter OTP <b>${verificationToken}</b></p>
    <p><i>DO NOT disclose it to anyone.</i><p>
    </h4>
    <br>
    <br>
    <p> Team EcoRide ©2024 </p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

// ================================ Registration page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/register.html"));
});

// ================================ Login page default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/login.html"));
});

// ================================ Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/login.html"));
});

// ================================ Verification page
app.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/verify.html"));
});

// ================================ After logging
app.get("/stu", (req, res) => {
  const loggedIn = req.session.loggedIn;
  if (loggedIn) {
    const username = req.session.profile;
    const filepath = path.join(__dirname, "./views/students.html");
    res.sendFile(filepath);
  } else {
    res.redirect("/login");
  }
});

// ================================ Registration
app.post("/register", async (req, res) => {
  const user = req.body;
  if (!user.password || !user.username) {
    res.send(
      `<script> alert("Username & password are required"); window.location.href = "/register"; </script>`
    );
    return;
  }
  if (user.password.length < 4) {
    res.send(
      `<script> alert("Password length must be >= 4"); window.location.href = "/register"; </script>`
    );
    return;
  }
  const username = req.body.username;
  const userExist = await Student.findOne({ username });

  if (userExist && userExist.isVerified === true) {
    res.send(
      `<script> alert("Username already exist!"); window.location.href = "/register"; </script>`
    );
    return;
  }

  const verificationToken = generateRandomToken();
  apnaOTP = verificationToken;

  const newUser = new Student(user);
  const saltRounds = 10;
  const hashedPwd = await bcrypt.hash(newUser.password, saltRounds);
  newUser.password = hashedPwd;
  newUser.verificationToken = verificationToken;
  try {
    await newUser.save();
    sendVerificationEmail(user.email, verificationToken);
    res.send(
      `<script> alert("Email Sent, Please Verify"); window.location.href = "/verified"; </script>`
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Couldn't Register Account");
  }
});

// ================================= Login
app.post("/login", async (req, res) => {
  const loginData = req.body;

  const account = (
    await Student.find().where("username").equals(loginData.username)
  )[0];
  if (!account) {
    res.send(
      `<script> alert("Username not found!"); window.location.href = "/login"; </script>`
    );
    return;
  }
  if (!account.isVerified) {
    res.send(
      `<script> alert("User not verified"); window.location.href = "/login"; </script>`
    );
    return;
  }
  const match = await bcrypt.compare(loginData.password, account.password);
  if (!match) {
    res.send(
      `<script> alert("Password incorrect"); window.location.href = "/login"; </script>`
    );
    return;
  }
  req.session.user = account.user;
  req.session.profile = account.username;
  req.session.loggedIn = true;
  res.redirect("/stu");
});

// ================================ Verification with OTP
app.post("/verify-otp", async (req, res) => {
  const userOtp = req.body.otp;
  if (userOtp === apnaOTP) {
    try {
      const user = await Student.findOneAndUpdate(
        { verificationToken: apnaOTP },
        { $set: { isVerified: true } },
        { new: true }
      );
      if (user) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    } catch (err) {
      console.log(err);
      res.json({ success: false });
    }
  } else {
    res.json("Incorrect OTP");
  }
});

// =============================== Verification with link
app.get("/verify", async (req, res) => {
  const { email, token } = req.query;

  try {
    // Find the user in the database using the Student model
    const user = await Student.findOne({
      email: email,
      verificationToken: token,
    });

    if (user) {
      // Mark the user as verified
      user.isVerified = true;
      await user.save();
      res.send(
        `<script> alert("Verification successful!"); window.location.href = "/login"; </script>`
      );
    } else {
      res.status(400).send("Invalid verification token or email.");
    }
  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).send("Internal server error.");
  }
});

// ================================ Logout
app.get("/logout", (req, res) => {
  req.session.loggedIn = false;
  res.send(
    `<script> alert("Logout successfully"); window.location.href = "/login"; </script>`
  );
});

app.listen(3000, () => {
  console.log("Server Started At: http://localhost:3000");
});
