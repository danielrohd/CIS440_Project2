"use strict";
let mysql = require("mysql");

function logIn(username, password) {

    let connectionString = {
        host: "107.180.1.16",
        database: "cis440fall2021group5",
        user: "fall2021group5",
        password: "group5fall2021"
    };
    let con = mysql.createConnection(connectionString);

    con.connect(

        function (err) {
            if (err) throw err;
        }
    );

    let sqlquery = `select username, password, firstName, lastName, email, birthday from UserAccounts 
        where username='${username}' and password='${password}';`;

    con.query(sqlquery, processResult);

    function processResult(err, result) {

        if (err) throw err;
    
        // lines execute if no errors
        if (result.length == 1) {
            result.forEach(printActor)
        } else {
            console.log('This account does not exist')
        }
        console.log(`There were ${result.length} rows of data returned`);
    
    }
    
    // dedicated method for handling each
    function printActor(record) {
    
        // print one record
        console.log(`${record.username} ${record.password}`);
        temp_user = new User(record.username, record.password, record.firstName, record.lastName, record.email, record.birthday);
        return temp_user
    }


}

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