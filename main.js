"use strict";
const mysql = require("mysql");
const express = require("express");
const bodyParser = require("body-parser");
const encoder = bodyParser.urlencoded();

const app = express();
app.use(express.urlencoded({extended: true}));
//app.use(express.json());
app.use("/home.css",express.static("home.css"));

const connection = mysql.createConnection({
    host: "107.180.1.16",
    database: "cis440fall2021group5",
    user: "fall2021group5",
    password: "group5fall2021"
});
connection.connect(function(error){
    if(error) throw error
    else console.log("connected to the database successfully")
})

app.get("/", function(req,res){
    res.sendFile(__dirname + "/home.html");
})

app.post("/",encoder,function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    connection.query("select * from UserAccounts where username= ? and password= ?;",[username,password],function(error,results,fields){
        if(results.length >0){
            res.redirect("/welcome");
        }
        else{
            res.redirect("/");
        }
        res.end();
})

})

//when login is success
app.get("/welcome",function(req,res){
    res.sendFile(__dirname + "/welcome.html")
})

app.listen(3000);

class User {
    constructor (username, password, first, last, email, birthday) {
        this.username = username;
        this.password = password;
        this.first = first;
        this.last = last;
        this.email = email;
        this.birthday = birthday;
        this.orgList = [];
    }
}

class Org {
    constructor (orgID, name, adminUsername) {
        this.orgID = orgID;
        this.name = name;
        this.adminUsername = adminUsername;
        this.userList = [];
    }
}