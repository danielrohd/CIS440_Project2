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
})

app.get("/createaccount.html", function (req, res) {
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

    // console.log(doesUsernameExist(username))

    if (password != password2) {
        res.redirect("/createaccount.html")
    } else {
        connection.query("insert into UserAccounts (username, password, firstName, lastName, birthday, email) values (?, ?, ?, ?, ?, ?);"
            , [username, password, first, last, birthday, email], function (error, results, fields) {
                if (error) throw error;
            })
        res.redirect("/")
    }

})

//when login is success
app.get("/views/welcome", function (req, res) {
    connection.query("select * from Organizations where orgId in (select orgId from OrgMembers where username = ?)", [userAccount.username], function (error, results, fields) {
        if (error) throw error;
        results.forEach(element => userAccount.addToOrgList(new Org(element.orgId, element.orgName, element.adminUsername)));

        // not sure why all this has to be inside the query function but it doesnt work if it isnt in here
        res.render('organization_home', {
            userAccount: userAccount,
        })
        app.use("/welcome.css", express.static("welcome.css"));
    })

})

app.post("/join-org", encoder, function (req, res) {
    var orgName = req.body.orgName;

    // seeing if org exists
    connection.query("select orgName, orgId from Organizations where orgName = ?", [orgName], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            var orgId = results[0].orgId;
            // inserting user into org if it does exist
            connection.query("insert into OrgMembers (username, orgId) values (?, ?);", [userAccount.username, orgId], function (error, results, fields) {
                if (error) throw error;
                // selecting the orgs full info to add it into the javascript variable
                connection.query("select * from Organizations where orgName = ?;", [orgName], function (error, results, fields) {
                    if (error) throw error;
                    userAccount.addToOrgList(new Org(results[0].orgId, results[0].orgName, results[0].adminUsername));
                    res.render('organization_home', {
                        userAccount: userAccount,
                    })
                })
            })
        } else {
            res.render('organization_home', {
                userAccount: userAccount,
            })
        }
    })
})

app.post("/create-org", encoder, function (req, res) {
    var orgName = req.body.orgName;

    // creating the org in the database
    connection.query("insert into Organizations (adminUsername, orgName) values (?, ?);", [userAccount.username, orgName], function (error, results, fields) {
        if (error) throw error;
    })

    // adding the creator as a member of the org
    connection.query(`insert into OrgMembers (username, orgId) values (?, (select orgId from Organizations where orgName = "${orgName}"));`, [userAccount.username],
        function (error, results, fields) {
            if (error) throw error;
            // selecting the full org info to add it to a javascript object
            connection.query("select * from Organizations where orgName = ?;", [orgName], function (error, results, fields) {
                if (error) throw error;
                userAccount.addToOrgList(new Org(results[0].orgId, results[0].orgName, results[0].adminUsername));
                res.render('organization_home', {
                    userAccount: userAccount,
                })
            })

        })
})

// will take user to an org page, where they can view their relationships, and if they are admin, can create new ones
app.post("/org-page", encoder, function (req, res) {
    // testing to make sure we can pull a value back to javascript, it works
    var selectedOrg = req.body.orgChoice;
    console.log(selectedOrg)

    res.render('organization_home', {
        userAccount: userAccount,
    })
})

// function doesUsernameExist(username) {
//     var answer = false;
//     connection.query("select username from UserAccounts where username= ?;", [username], function (error, results, fields) {
//         if (error) throw error;
//         console.log(results.length)
//         if (results.length > 0) {
//             answer = true;
//             console.log(answer)
//             return callback(answer)
//         } else {
//             answer = false;
//             console.log(answer)
//             return callback(answer)
//         }
//     })
// }

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
        this.relationshipList = [];
    }

    addToOrgList(org) {
        this.orgList.push(org)
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

class Relationship {
    constructor(relationshipID, mentor, mentee, startDate, endDate = null, orgID) {
        this.relationshipID = relationshipID;
        this.mentor = mentor;
        this.mentee = mentee;
        this.orgID = orgID;
        this.goalList = [];

        this.startDate = [];
        startDate[0] = startDate.getFullYear();
        startDate[1] = startDate.getMonth() + 1;
        startDate[2] = startDate.getDate();
        this.startDateString = `${startDate[1]}/${startDate[2]}/${startDate[0]}`

        this.endDate = [];
        endDate[0] = endDate.getFullYear();
        endDate[1] = endDate.getMonth() + 1;
        endDate[2] = endDate.getDate();
        this.endDateString = `${endDate[1]}/${endDate[2]}/${endDate[0]}`
    }
}

class Goal {
    constructor(goalID, relationshipID, goalInfo, dueDate, startDate, orgID) {
        this.goalID = goalID;
        this.relationshipID = relationshipID;
        this.goalInfo = goalInfo;
        this.orgID = orgID;
        this.commentList = [];
        this.stepList = [];

        this.dueDate = [];
        dueDate[0] = dueDate.getFullYear();
        dueDate[1] = dueDate.getMonth() + 1;
        dueDate[2] = dueDate.getDate();
        this.dueDateString = `${dueDate[1]}/${dueDate[2]}/${dueDate[0]}`

        this.startDate = [];
        startDate[0] = startDate.getFullYear();
        startDate[1] = startDate.getMonth() + 1;
        startDate[2] = startDate.getDate();
        this.startDateString = `${startDate[1]}/${startDate[2]}/${startDate[0]}`
    }
}

class Comment {
    constructor(commentID, commentText, commentDate, goalID) {
        this.commentID = commentID;
        this.commentText = commentText;
        this.goalID = goalID;

        this.commentDate = [];
        commentDate[0] = commentDate.getFullYear();
        commentDate[1] = commentDate.getMonth() + 1;
        commentDate[2] = commentDate.getDate();
        this.commentDate = `${commentDate[1]}/${commentDate[2]}/${commentDate[0]}`
    }
}

class Step {
    constructor(stepID, stepText, completed = false, goalID) {
        this.stepID = stepID;
        this.stepText = stepText;
        this.completed = completed;
        this.goalID = goalID;
    }
}