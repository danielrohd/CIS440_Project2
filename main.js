"use strict";
const mysql = require("mysql");
const express = require("express");
const bodyParser = require("body-parser");
const encoder = bodyParser.urlencoded();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
//app.use(express.json());
app.use("/home.css", express.static("home.css"));

let userAccount;

const connection = mysql.createConnection({
    host: "107.180.1.16",
    database: "cis440fall2021group5",
    user: "fall2021group5",
    password: "group5fall2021"
});
connection.connect(function (error) {
    if (error) throw error
    else console.log("connected to the database successfully")
})

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/home.html");
})

app.post("/", encoder, function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    connection.query("select * from UserAccounts where username= ? and password= ?;", [username, password], function (error, results, fields) {
        if (results.length > 0) {
            userAccount = new User(results[0].username, results[0].password, results[0].firstName, results[0].lastName, results[0].email, results[0].birthday)
            res.redirect("/views/welcome");
        }
        else {
            res.redirect("/");
        }
        res.end();
    })
})

app.post("/createaccount.html", encoder, function (req, res) {
    res.redirect("/createaccount.html")
    // res.sendFile(__dirname + "/createaccount.html")
})

app.get("/createaccount.html", function (req, res) {
    // res.sendFile(__dirname + "/welcome.html")
    // res.send(`<p>${userAccount.first} ${userAccount.last}<br>${userAccount.username}<br>${userAccount.birthdayString}<br>${userAccount.email}</p>`);
    res.sendFile(__dirname + "/createaccount.html")
    app.use("/createaccount.css", express.static("createaccount.css"));
})

app.post("/create-account", encoder, function (req, res) {
    var first = req.body.first;
    var last = req.body.last;
    var email = req.body.email;
    var birthday = req.body.birthday;
    var username = req.body.username;
    var password = req.body.password;
    var password2 = req.body.password2;

    // if (password != password2) {
    //     alert("Passwords do not match.")
    // }

    connection.query("insert into UserAccounts (username, password, firstName, lastName, email, birthday) values (?, ?, ?, ?, ?, ?);"
        , [username, password, first, last, birthday, email], function (error, results, fields) {
            if (error) throw error;
        })
    res.end();

})

//when login is success
app.get("/views/welcome", function (req, res) {
    // res.sendFile(__dirname + "/welcome.html")
    // res.send(`<p>${userAccount.first} ${userAccount.last}<br>${userAccount.username}<br>${userAccount.birthdayString}<br>${userAccount.email}</p>`);
    res.render('welcome', {
        userAccount: userAccount
    })
})

app.listen(3000);

class User {
    constructor(username, password, first, last, email, birthday) {
        this.username = username;
        this.password = password;
        this.first = first;
        this.last = last;
        this.email = email;
        this.birthday = [];
        birthday[0] = birthday.getFullYear();
        birthday[1] = birthday.getMonth() + 1;
        birthday[2] = birthday.getDate();
        this.birthdayString = `${birthday[1]}/${birthday[2]}/${birthday[0]}`
        this.orgList = [];
    }
}

class Org {
    constructor(orgID, name, adminUsername) {
        this.orgID = orgID;
        this.name = name;
        this.adminUsername = adminUsername;
        this.userList = [];
    }
}