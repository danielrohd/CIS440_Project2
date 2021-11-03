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

        connection.query("select * from Relationships where mentee= ? or mentor= ?;", [userAccount.username, userAccount.username], function (error, results, fields) {
            if (error) throw error;
            results.forEach(element => userAccount.addToRelList(new Relationship(element.relationshipID, element.mentor, element.mentee, element.startDate, element.endDate, element.orgID)));
            userAccount.orgList.forEach(element =>
                connection.query("select username from OrgMembers where orgID = ?;", [element.orgID], function (error, results, fields) {
                    if (error) throw error;
                    console.log(element)
                    results.forEach(e=> element.addToUserList(e.username));
                    console.log("here");
                }))
            
            userAccount.relationshipList.forEach(element => 
                connection.query("select * from Goals where relationshipID = ?;", [element.relationshipID], function (error, results, fields) {
                    results.forEach(e=> element.addToGoalList(new Goal(e.goalID, e.relationshipID, e.goalInfo, e.dueDate, e.startDate, e.orgId)));
                }))
            // not sure why all this has to be inside the query function but it doesnt work if it isnt in here
            res.render('organization_home', {
                userAccount: userAccount,
            })
            console.log(userAccount.orgList.userList)
            app.use("/welcome.css", express.static("welcome.css"));
        })


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

var orgId;
var adminUsername;
var selectedOrg;
var relationshipID;

// will take user to an org page, where they can view their relationships, and if they are admin, can create new ones
app.post("/org-page", encoder, function (req, res) {
    // testing to make sure we can pull a value back to javascript, it works
    selectedOrg = req.body.orgChoice;
    // console.log(selectedOrg)
    console.log(userAccount.orgList[0].userList)

    // getting the orgId so it can be referenced in the page to print only relationships with that org
    connection.query("select orgId, adminUsername from Organizations where orgName = ?;", [selectedOrg], function (error, results, fields) {
        if (error) throw error;
        orgId = results[0].orgId
        adminUsername = results[0].adminUsername;
        res.render('org_page', {
            userAccount: userAccount,
            selectedOrg: selectedOrg,
            orgId: orgId,
            adminUsername: adminUsername,
            relationshipID: relationshipID
        })
    })
})

// allows the user to create a relationship, if they are the admin of the org
app.post("/create-relationship", encoder, function (req, res) {
    var mentor = req.body.mentor;
    var mentee = req.body.mentee;
    console.log(mentee, mentor)

    // checks if the mentor and mentee aren't the same
    if (mentor == mentee) {
        res.render('org_page', {
            userAccount: userAccount,
            selectedOrg: selectedOrg,
            orgId: orgId,
            adminUsername: adminUsername,
            relationshipID: relationshipID
        })
    } else {
        // checks if the relationship already exists
        connection.query("select * from Relationships where mentee= ? and mentor= ? and orgID= ?;", [mentee, mentor, orgId], function (error, results, fields) {
            if  (error) throw error;
            if (results.length > 0) {
                res.render('org_page', {
                    userAccount: userAccount,
                    selectedOrg: selectedOrg,
                    orgId: orgId,
                    adminUsername: adminUsername,
                    relationshipID: relationshipID
                })
            } else {
                // if the relationship doesnt exist, creates it
                var today = new Date();
                var date = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate();
                connection.query("insert into Relationships (mentor, mentee, startDate, orgID) values (?, ?, ?, ?);", [mentor, mentee, date, orgId], function (error, results, fields) {
                    if (error) throw error;
                    // adds the relationship to the proper list
                    connection.query("select * from Relationships where mentor = ? and mentee = ? and orgID = ?;", [mentor, mentee, orgId], function (error, results, fields) {
                        if (error) throw error;
                        userAccount.addToRelList(new Relationship(results[0].relationshipID, results[0].mentor, results[0].mentee, results[0].startDate, results[0].endDate, results[0].orgID));
                        res.render('org_page', {
                            userAccount: userAccount,
                            selectedOrg: selectedOrg,
                            orgId: orgId,
                            adminUsername: adminUsername,
                            relationshipID: relationshipID
                        })
                    })
                    
                })
            }
        })
    }
})

app.post("/display-goals", encoder, function (req, res) {
    relationshipID = req.body.relId
    console.log(relationshipID)

    res.render('org_page', {
        userAccount: userAccount,
        selectedOrg: selectedOrg,
        orgId: orgId,
        adminUsername: adminUsername,
        relationshipID: relationshipID
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

    addToRelList(rel) {
        this.relationshipList.push(rel)
    }
}

class Org {
    constructor(orgID, name, adminUsername) {
        this.orgID = orgID;
        this.name = name;
        this.adminUsername = adminUsername;
        this.userList = [];
    }

    addToUserList(user) {
        this.userList.push(user);
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

        if (endDate != null) {
            this.endDate = [];
            endDate[0] = endDate.getFullYear();
            endDate[1] = endDate.getMonth() + 1;
            endDate[2] = endDate.getDate();
            this.endDateString = `${endDate[1]}/${endDate[2]}/${endDate[0]}`
        }

    }

    addToGoalList(goal) {
        this.goalList.push(goal)
    }

    addEndDate(date) {
        this.endDate = [];
        endDate[0] = date.getFullYear();
        endDate[1] = date.getMonth() + 1;
        endDate[2] = date.getDate();
        this.endDateString = `${endDate[1]}/${endDate[2]}/${endDate[0]}`
    }
}

class Goal {
    constructor(goalID, relationshipID, goalInfo, dueDate = null, startDate, orgID) {
        this.goalID = goalID;
        this.relationshipID = relationshipID;
        this.goalInfo = goalInfo;
        this.orgID = orgID;
        this.commentList = [];
        this.stepList = [];

        if (dueDate != null) {
            this.dueDate = [];
            dueDate[0] = dueDate.getFullYear();
            dueDate[1] = dueDate.getMonth() + 1;
            dueDate[2] = dueDate.getDate();
            this.dueDateString = `${dueDate[1]}/${dueDate[2]}/${dueDate[0]}`
        }


        this.startDate = [];
        startDate[0] = startDate.getFullYear();
        startDate[1] = startDate.getMonth() + 1;
        startDate[2] = startDate.getDate();
        this.startDateString = `${startDate[1]}/${startDate[2]}/${startDate[0]}`
    }

    addToCommentList(comment) {
        this.commentList.push(comment);
    }

    addToStepList(step) {
        this.stepList.push(step);
    }

    addDueDate(date) {
        this.dueDate = [];
        dueDate[0] = date.getFullYear();
        dueDate[1] = date.getMonth() + 1;
        dueDate[2] = date.getDate();
        this.dueDateString = `${dueDate[1]}/${dueDate[2]}/${dueDate[0]}`
    }
}

class Comment {
    constructor(commentID, commentText, commentDate, goalID, author) {
        this.commentID = commentID;
        this.commentText = commentText;
        this.goalID = goalID;
        this.author = author;

        this.commentDate = [];
        commentDate[0] = commentDate.getFullYear();
        commentDate[1] = commentDate.getMonth() + 1;
        commentDate[2] = commentDate.getDate();
        this.commentDate = `${commentDate[1]}/${commentDate[2]}/${commentDate[0]}`
    }
}

class Step {
    constructor(stepID, stepText, completed = 0, goalID) {
        this.stepID = stepID;
        this.stepText = stepText;
        this.completed = completed;
        this.goalID = goalID;
    }
}

// //new stuff for the homepage things
// function openPage(pageName, elmnt, color) {
//     // Hide all elements with class="tabcontent" by default */
//     var i, tabcontent, tablinks;
//     tabcontent = document.getElementsByClassName("tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//       tabcontent[i].style.display = "none";
//     }

//     // Remove the background color of all tablinks/buttons
//     tablinks = document.getElementsByClassName("tablink");
//     for (i = 0; i < tablinks.length; i++) {
//       tablinks[i].style.backgroundColor = "";
//     }

//     // Show the specific tab content
//     document.getElementById(pageName).style.display = "block";

//     // Add the specific color to the button used to open the tab content
//     elmnt.style.backgroundColor = color;
//   }

//   // Get the element with id="defaultOpen" and click on it
//   document.getElementById("defaultOpen").click();


// function openForm1() {
//     document.getElementById("myForm").style.display = "block";
//   }
  
//   function closeForm1() {
//     document.getElementById("myForm").style.display = "none";
//   }