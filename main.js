"use strict";
const mysql = require("mysql");
const express = require("express");
const bodyParser = require("body-parser");
const e = require("express");
const { connect } = require("mssql");
const encoder = bodyParser.urlencoded();
const nodemailer = require('nodemailer');
let mailDetails;

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
//app.use(express.json());
app.use("/home.css", express.static("home.css"));

let userAccount;

let mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'notFacebook440@gmail.com',
        pass: 'codingPassword321'
    }
});

const connection = mysql.createConnection({
    host: "107.180.1.16",
    database: "cis440fall2021group5",
    user: "fall2021group5",
    password: "group5fall2021"
});

setInterval(function () {
    connection.query("select 1");
}, 5000);

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
            // populating the userlist of each org
            userAccount.orgList.forEach(element =>
                connection.query("select username from OrgMembers where orgID = ?;", [element.orgID], function (error, results, fields) {
                    if (error) throw error;
                    console.log(element)
                    results.forEach(e => element.addToUserList(e.username));
                    console.log("here");
                }))


            // populating the goals list of each relationship
            userAccount.relationshipList.forEach(element =>
                connection.query("select * from Goals where relationshipID = ?;", [element.relationshipID], function (error, results, fields) {
                    if (error) throw error;
                    results.forEach(e => element.addToGoalList(new Goal(e.goalID, e.relationshipID, e.goalInfo, e.dueDate, e.startDate, e.orgId, e.completed)));
                    console.log('here1')
                    element.goalList.forEach(el =>
                        connection.query("select * from GoalSteps where goalID= ?;", [el.goalID], function (error, results, fields) {
                            if (error) throw error;
                            el.checkStepCompletion();
                            results.forEach(results => el.addToStepList(new Step(results.stepID, results.stepText, results.completed, results.goalID)));
                        }));
                    element.goalList.forEach(el =>
                        connection.query("select * from GoalComments where goalID= ?;", [el.goalID], function (error, results, fields) {
                            if (error) throw error;
                            results.forEach(results => el.addToCommentList(new Comment(results.commentID, results.commentText, results.commentDate, results.goalID, results.authorUsername)));
                        }));
                }));

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
var goalID;
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
        relationshipID = undefined;
        console.log(orgId, relationshipID)
        app.use("/org.css", express.static("org.css"))
        res.render('org_page', {
            userAccount: userAccount,
            selectedOrg: selectedOrg,
            orgId: orgId,
            adminUsername: adminUsername,
            relationshipID: relationshipID
        })
        app.use("/views/org.css", express.static("/views/org.css"))
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
            if (error) throw error;
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
                var date = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
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
    userAccount.relationshipList.forEach(rel => {
        if (rel.relationshipID == relationshipID) {
            rel.goalList.forEach(goal => {
                goal.checkStepCompletion()
            })
        }
    })


    res.render('org_page', {
        userAccount: userAccount,
        selectedOrg: selectedOrg,
        orgId: orgId,
        adminUsername: adminUsername,
        relationshipID: relationshipID
    })
    app.use("org.css", express.static("org.css"))
})

app.post("/create-goal", encoder, function (req, res) {
    var goalText = req.body.goalInfo;
    var dueDate = req.body.dueDate;
    var step1 = req.body.step1;


    var today = new Date();
    var date = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();

    // creating new goal
    connection.query("insert into Goals (relationshipID, goalInfo, dueDate, startDate, orgId, completed) values (?, ?, ?, ?, ?, ?);", [relationshipID, goalText, dueDate, date, orgId, 0],
        function (error, results, fields) {
            if (error) throw error;
            // finding the new goal to create object
            connection.query("select * from Goals where relationshipID = ? and goalInfo = ? and dueDate = ? and startDate = ? and orgId = ? and completed = ?;", [relationshipID, goalText, dueDate, date, orgId, 0],
                function (error, results, fields) {
                    if (error) throw error;
                    goalID = results[0].goalID;
                    // finding the right list for the object
                    userAccount.relationshipList.forEach(el => {
                        console.log(results)
                        if (el.relationshipID == relationshipID) {
                            // adding the goal to the correct list
                            el.addToGoalList(new Goal(results[0].goalID, results[0].relationshipID, results[0].goalInfo, results[0].dueDate, results[0].startDate, results[0].orgId, results[0].completed))
                            // creating the step for the goal
                            connection.query("insert into GoalSteps (stepText, completed, goalID) values (?, 0, ?);", [step1, goalID], function (error, results, fields) {
                                if (error) throw error;
                                // finding the step to create object
                                connection.query("select * from GoalSteps where stepText = ? and completed = ? and goalID = ?;", [step1, 0, goalID], function (error, results, fields) {
                                    // finding the right list for the step
                                    el.goalList.forEach(goal => {
                                        if (goal.goalID == goalID) {
                                            // adding the step object to the list
                                            goal.addToStepList(new Step(results[0].stepID, results[0].stepText, results[0].completed, results[0].goalID))
                                            res.render('org_page', {
                                                userAccount: userAccount,
                                                selectedOrg: selectedOrg,
                                                orgId: orgId,
                                                adminUsername: adminUsername,
                                                relationshipID: relationshipID
                                            })
                                            var otherUsername;
                                            if (el.mentee == userAccount.username) {
                                                otherUsername = el.mentor;
                                            } else {
                                                otherUsername = el.mentee;
                                            }
                                            connection.query("select email from UserAccounts where username = ?;", [otherUsername], function (error, results, fields) {
                                                if (error) throw error;
                                                var emailTo = results[0].email;
                                                mailDetails = {
                                                    from: 'notFacebook440@gmail.com',
                                                    to: `${emailTo}`,
                                                    subject: `${userAccount.first} just created a new goal!`,
                                                    text: `${userAccount.first} ${userAccount.last} just added a new goal to your mentor-mentee relationship! Their goal is: ${goalText}`
                                                };
                                                mailTransporter.sendMail(mailDetails, function (err, data) {
                                                    if (err) {
                                                        console.log('Error Occurs');
                                                    } else {
                                                        console.log('Email sent successfully');
                                                    }
                                                });
                                            })
                                        }
                                    })
                                })
                            })
                        }
                    })
                })
        })
})

app.post("/create-comment", encoder, function (req, res) {
    var commentText = req.body.newComment;
    var tempGoalID = req.body.goalID;
    console.log(commentText, tempGoalID);
    var today = new Date();
    var date = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();


    connection.query("insert into GoalComments (commentText, commentDate, goalID, authorUsername) values (?, ?,?,?);", [commentText, date, tempGoalID, userAccount.username], function (error, results, fields) {
        if (error) throw error;
        connection.query("select * from GoalComments where commentText = ? and commentDate = ? and goalID = ? and authorUsername = ?;", [commentText, date, tempGoalID, userAccount.username], function (error, results, fields) {
            if (error) throw error;
            userAccount.relationshipList.forEach(el => {
                if (el.relationshipID == relationshipID) {

                    el.goalList.forEach(goal => {
                        if (goal.goalID == tempGoalID) {
                            // adding the step object to the list
                            goal.addToCommentList(new Comment(results[0].commentID, results[0].commentText, results[0].commentDate, results[0].goalID, results[0].authorUsername))
                            res.render('org_page', {
                                userAccount: userAccount,
                                selectedOrg: selectedOrg,
                                orgId: orgId,
                                adminUsername: adminUsername,
                                relationshipID: relationshipID
                            })
                        }
                    })
                }
            })


        })

    })
})

app.post("/create-step", encoder, function (req, res) {
    var goalStep = req.body.newStep;
    var tempGoalID = req.body.goalID;

    connection.query("insert into GoalSteps (stepText, completed, goalID) values (?, ?, ?);", [goalStep, 0, tempGoalID], function (error, results, fields) {
        if (error) throw error;
        connection.query("select * from GoalSteps where stepText = ? and completed = ? and goalID = ?;", [goalStep, 0, tempGoalID], function (error, results, fields) {
            if (error) throw error;
            userAccount.relationshipList.forEach(el => {
                if (el.relationshipID == relationshipID) {

                    el.goalList.forEach(goal => {
                        if (goal.goalID == tempGoalID) {
                            // adding the step object to the list
                            goal.addToStepList(new Step(results[0].stepID, results[0].stepText, results[0].completed, results[0].goalID))
                            goal.checkStepCompletion()
                            res.render('org_page', {
                                userAccount: userAccount,
                                selectedOrg: selectedOrg,
                                orgId: orgId,
                                adminUsername: adminUsername,
                                relationshipID: relationshipID
                            })
                        }
                    })
                }
            })
        })
    })
})

app.post("/mark-step-complete", encoder, function (req, res) {
    var stepID = req.body.tempStepID;
    var completed = req.body.completedValue;
    var tempGoalID = req.body.goalID;
    var newCompleted;

    if (completed == 0) {
        newCompleted = 1;
    } else {
        newCompleted = 0;
    }

    connection.query("UPDATE `cis440fall2021group5`.`GoalSteps` SET completed = ? WHERE stepID = ?;", [newCompleted, stepID], function (error, results, fields) {
        if (error) throw error;
        userAccount.relationshipList.forEach(rel => {
            if (rel.relationshipID == relationshipID) {
                rel.goalList.forEach(goal => {
                    if (tempGoalID == goal.goalID) {
                        goal.stepList.forEach(step => {
                            if (stepID == step.stepID) {
                                step.completed = newCompleted;
                                step.updateCompletedText()
                                goal.checkStepCompletion()
                                res.render('org_page', {
                                    userAccount: userAccount,
                                    selectedOrg: selectedOrg,
                                    orgId: orgId,
                                    adminUsername: adminUsername,
                                    relationshipID: relationshipID
                                })
                            }
                        })
                    }
                })
            }
        })
    })
})

app.post("/mark-goal-complete", encoder, function (req, res) {
    var tempGoalID = req.body.goalID;
    var completed = req.body.completedValue;
    var newCompleted;

    if (completed == 0) {
        newCompleted = 1;
    } else {
        newCompleted = 0;
    }

    connection.query("UPDATE `cis440fall2021group5`.`Goals` SET completed = ? WHERE goalID = ?;", [newCompleted, tempGoalID], function (error, results, fields) {
        if (error) throw error;
        userAccount.relationshipList.forEach(rel => {
            if (rel.relationshipID == relationshipID) {
                rel.goalList.forEach(goal => {
                    if (goal.goalID == tempGoalID) {
                        goal.completed = newCompleted;
                        goal.checkStepCompletion()
                        res.render('org_page', {
                            userAccount: userAccount,
                            selectedOrg: selectedOrg,
                            orgId: orgId,
                            adminUsername: adminUsername,
                            relationshipID: relationshipID
                        })
                        var otherUsername;
                        if (rel.mentee == userAccount.username) {
                            otherUsername = rel.mentor;
                        } else {
                            otherUsername = rel.mentee;
                        }
                        connection.query("select email from UserAccounts where username = ?;", [otherUsername], function (error, results, fields) {
                            if (error) throw error;
                            var emailTo = results[0].email;
                            mailDetails = {
                                from: 'notFacebook440@gmail.com',
                                to: `${emailTo}`,
                                subject: `${userAccount.first} just completed their goal!`,
                                text: `${userAccount.first} ${userAccount.last} just marked their goal, "${goal.goalInfo}", as completed!`
                            };
                            mailTransporter.sendMail(mailDetails, function (err, data) {
                                if (err) {
                                    console.log('Error Occurs');
                                } else {
                                    console.log('Email sent successfully');
                                }
                            });
                        })
                    }
                })
            }
        })
    })

})

app.post("/expand-goal", encoder, function (req, res) {
    var goalID = req.body.goalID;
    userAccount.relationshipList.forEach(rel => {
        if (rel.relationshipID == relationshipID) {
            rel.goalList.forEach(goal => {
                if (goal.goalID == goalID) {
                    if (goal.expanded == 1) {
                        goal.expanded = 0;
                    }
                    else {
                        goal.expanded = 1;
                    }



                }
                else {
                    goal.expanded = 0;
                }

            })
            res.render('org_page', {
                userAccount: userAccount,
                selectedOrg: selectedOrg,
                orgId: orgId,
                adminUsername: adminUsername,
                relationshipID: relationshipID
            })
        }
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

    getPercentageComplete(){
        var completedGoals = 0;
        var totalGoals = 0;
        this.goalList.forEach(goal=>{
            if(goal.completed == 1){
                completedGoals += 1;
            }
            totalGoals += 1;
        })
        console.log(completedGoals/totalGoals)
        return completedGoals / totalGoals;
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
    constructor(goalID, relationshipID, goalInfo, dueDate = null, startDate, orgID, completed) {
        this.goalID = goalID;
        this.relationshipID = relationshipID;
        this.goalInfo = goalInfo;
        this.orgID = orgID;
        this.completed = completed;
        this.stepsComplete;
        this.expanded = 0;
        this.commentList = [];
        this.stepList = [];

        if (dueDate != null) {
            this.dueDate = [];
            dueDate[0] = dueDate.getFullYear();
            dueDate[1] = dueDate.getMonth() + 1;
            dueDate[2] = dueDate.getDate();
            this.dueDateString = `${dueDate[1]}/${dueDate[2]}/${dueDate[0]}`
        } else {
            this.dueDateString = "N/A"
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

    checkStepCompletion() {
        this.stepList.every(step => {
            if (step.completed == 0) {
                this.stepsComplete = 0;
                return false;
            } else {
                this.stepsComplete = 1;
                return true;
            }
        })
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
        this.commentDateString = `${commentDate[1]}/${commentDate[2]}/${commentDate[0]}`
    }
}

class Step {
    constructor(stepID, stepText, completed = 0, goalID) {
        this.stepID = stepID;
        this.stepText = stepText;
        this.completed = completed;
        this.goalID = goalID;
        this.completedText;

        if (this.completed == 0) {
            this.completedText = "Incomplete"
        } else {
            this.completedText = "Complete"
        }
    }

    updateCompletedText() {
        if (this.completed == 0) {
            this.completedText = "Incomplete"
        } else {
            this.completedText = "Complete"
        }
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