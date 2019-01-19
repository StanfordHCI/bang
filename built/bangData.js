"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var child = require("child_process");
var exec = child.exec;
var mturk = require("./mturkTools");
var dir = "./.data/";
function set(array) {
    var setArray = [];
    array.forEach(function (element) {
        if (!setArray.includes(element)) {
            setArray.push(element);
        }
    });
    return setArray;
}
var Datastore = require("nedb"), db = {
    users: new Datastore({
        filename: ".data/users",
        autoload: true,
        timestampData: true
    }),
    chats: new Datastore({
        filename: ".data/chats",
        autoload: true,
        timestampData: true
    }),
    batch: new Datastore({
        filename: ".data/batch",
        autoload: true,
        timestampData: true
    }),
    time: new Datastore({
        filename: ".data/time",
        autoload: true,
        timestampData: true
    }),
    ourHITs: new Datastore({
        filename: ".data/ourHITs",
        autoload: true,
        timestampData: true
    })
};
//Renders a full db by name.
function renderBatch(dbName, batch) {
    db[dbName].find({}, function (err, data) {
        console.log(JSON.stringify(data.filter(function (u) { return u.batch == batch; })));
        // console.log(data.filter(u => u.batch == 1534088685920)[0].results)
    });
}
//Cleanly renders chats for a given batch
function renderChats(batch) {
    fs.readFile(dir + batch + "/" + "chats.json", function (err, chatsJSON) {
        if (err) {
            return console.log(err);
        }
        else {
            try {
                var chats_1 = JSON.parse(String(chatsJSON));
                // console.log("\nChats for batch:",batch);
                set(chats_1.map(function (a) { return a.round; }))
                    .sort()
                    .forEach(function (currentRound) {
                    // console.log("\nRound", currentRound);
                    set(chats_1.map(function (a) { return a.round; }))
                        .sort()
                        .forEach(function (currentRoom) {
                        // console.log("\nRoom",currentRoom,"in round",currentRound);
                        var ads = chats_1
                            .sort(function (a, b) { return a.time - b.time; })
                            .filter(function (a) { return a.room == currentRoom && a.round == currentRound; })
                            .filter(function (a) { return a.message[0] === "!"; });
                        // ads.forEach(m => console.log("  ",m.message))
                        var chosenAd = ads[ads.length - 1];
                        var ad = {
                            batch: chosenAd.batch,
                            round: chosenAd.round,
                            room: chosenAd.room,
                            text: chosenAd.message.slice(1),
                            user: chosenAd.userID
                        };
                        console.log(ad.batch, ad.round, ad.room, ad.text);
                    });
                });
            }
            catch (err) {
                // console.log('File ending error in batch',batch)
            }
        }
    });
}
//Cleanly renders ads for a given batch
function renderAds(batch) {
    fs.readFile(dir + batch + "/" + "chats.json", function (err, chatsJSON) {
        if (err) {
            return console.log(err);
        }
        else {
            try {
                var chats_2 = JSON.parse(String(chatsJSON));
                // console.log("\nChats for batch:",batch);
                set(chats_2.map(function (a) { return a.round; }))
                    .sort()
                    .forEach(function (currentRound) {
                    // console.log("\nRound", currentRound);
                    set(chats_2.map(function (a) { return a.round; }))
                        .sort()
                        .forEach(function (currentRoom) {
                        // console.log("\nRoom",currentRoom,"in round",currentRound);
                        var ads = chats_2
                            .sort(function (a, b) { return a.time - b.time; })
                            .filter(function (a) { return a.room == currentRoom && a.round == currentRound; }); //.filter(a => a.message[0] === "!")
                        ads = ads.slice(ads.length - 5);
                        ads.forEach(function (m) { return console.log("  ", m.message); });
                        var chosenAd = ads[ads.length - 1];
                        var ad = {
                            batch: chosenAd.batch,
                            round: chosenAd.round,
                            room: chosenAd.room,
                            text: chosenAd.message.slice(1, 31),
                            user: chosenAd.userID
                        };
                        console.log([ad.batch, ad.round, ad.room, ad.text].join("|"));
                        // console.log(ad.text);
                    });
                });
            }
            catch (err) {
                // console.log('File ending error in batch',batch)
            }
        }
    });
}
//Goes through stored data and checks for bonuses. Bonuses any remaining work.
function retroactiveBonus() {
    var batchFolders = fs
        .readdirSync(dir)
        .filter(function (f) { return fs.statSync(dir + f).isDirectory(); });
    batchFolders
        .filter(function (f) { return fs.readdirSync(dir + f).includes("users.json"); })
        .forEach(function (f) {
        fs.readFile(dir + f + "/" + "users.json", function (err, usersJSON) {
            if (err) {
                return console.log(err);
            }
            else {
                try {
                    var allUsers_1 = JSON.parse(String(usersJSON));
                    allUsers_1.forEach(function (u) {
                        if (u.bonus == "6.996.99")
                            u.bonus = "6.99";
                        if (u.bonus == "2.002.00")
                            u.bonus = "2.00";
                    });
                    mturk.payBonuses(allUsers_1, function (paidUsers) {
                        allUsers_1
                            .filter(function (u) { return paidUsers.map(function (p) { return p.id; }).includes(u.id); })
                            .forEach(function (u) { return (u.bonus = 0); });
                        fs.writeFile(dir + f + "/" + "users.json", JSON.stringify(allUsers_1, null, 2), function (err) {
                            if (err) {
                                return console.log(err);
                            }
                            else {
                                /* console.log("saved",f); */
                            }
                        });
                    });
                }
                catch (err) {
                    console.log("File ending error at:", f);
                }
            }
        });
    });
}
// Add qualification to all users
function retroactiveQualification(qualification) {
    var batchFolders = fs
        .readdirSync(dir)
        .filter(function (f) { return fs.statSync(dir + f).isDirectory(); });
    batchFolders
        .filter(function (f) { return fs.readdirSync(dir + f).includes("users.json"); })
        .forEach(function (f) {
        fs.readFile(dir + f + "/" + "users.json", function (err, usersJSON) {
            if (err) {
                return console.log(err);
            }
            else {
                var allUsers = JSON.parse(String(usersJSON));
                mturk.assignQualificationToUsers(allUsers, qualification);
            }
        });
    });
}
//Goes through stored data and adds rooms from chats if they are not propperly stored.
function retroactivelyFixRooms() {
    var batchFolders = fs
        .readdirSync(dir)
        .filter(function (f) { return fs.statSync(dir + f).isDirectory(); });
    batchFolders
        .filter(function (f) {
        return fs.readdirSync(dir + f).includes("users.json") &&
            fs.readdirSync(dir + f).includes("chats.json");
    })
        .forEach(function (f) {
        fs.readFile(dir + f + "/" + "users.json", function (err, usersJSON) {
            if (err) {
                return console.log(err);
            }
            else {
                var users_1 = JSON.parse(String(usersJSON));
                try {
                    if (users_1[0].rooms.length == 0) {
                        fs.readFile(dir + f + "/" + "chats.json", function (err, chatJSON) {
                            if (err) {
                                return console.log(err);
                            }
                            else {
                                var chats = JSON.parse(String(chatJSON));
                                var orderedChats_1 = chats.sort(function (a, b) { return a.time - b.time; });
                                users_1.forEach(function (u) {
                                    u.rooms = [];
                                    var roomsObj = {};
                                    orderedChats_1
                                        .filter(function (c) { return c.userID == u.id; })
                                        .forEach(function (c) {
                                        roomsObj[c.round] = c.room;
                                    });
                                    try {
                                        u.results.format.forEach(function (f, i) {
                                            var room = roomsObj[i];
                                            if (room != null) {
                                                u.rooms.push(room);
                                            }
                                        });
                                    }
                                    catch (err) { }
                                });
                                fs.writeFile(dir + f + "/" + "users.json", JSON.stringify(users_1, null, 2), function (err) {
                                    if (err) {
                                        return console.log(err);
                                    }
                                    else {
                                        console.log("saved", f);
                                    }
                                });
                            }
                        });
                    }
                }
                catch (err) { }
            }
        });
    });
}
//Renders a full db by name.
function saveOutBatch(dbName, batch) {
    var batchDir = dir + batch;
    if (!fs.existsSync(batchDir)) {
        fs.mkdirSync(batchDir);
    }
    db[dbName].find({}, function (err, data) {
        fs.writeFile(batchDir + "/" + dbName + ".json", JSON.stringify(data.filter(function (u) { return u.batch == batch || u.batchID == batch; }), null, 2), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("Batch", batch, dbName, "saved!");
        });
    });
}
function useLatestBatch(callback) {
    db.batch.find({}, function (err, data) {
        var lastBatch = data
            .map(function (b) { return b.batchID; })
            .sort()
            .pop();
        if (typeof callback == "function") {
            callback(lastBatch);
            return lastBatch;
        }
    });
    return console.log("None");
}
function useEachBatchDB(callback) {
    db.batch.find({}, function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            var batches = data.map(function (b) { return b.batchID; }).sort();
            if (typeof callback == "function") {
                return batches.map(callback);
            }
        }
    });
}
function saveAllData() {
    useEachBatchDB(function (batch) {
        ["users", "chats", "batch"].forEach(function (data) {
            saveOutBatch(data, batch);
        });
    });
}
function downloadData(url, callback) {
    var pemFile = "~/.ssh/sh-batch.pem";
    if (url.includes("mark") || url.includes("bang")) {
        pemFile = "~/.ssh/sh-server.pem";
    }
    var destination = ".data";
    var names = ["users", "chats", "batch"];
    names.forEach(function (name) {
        var source = "ubuntu@" + url + ":bang/.data/" + name;
        var command = ["scp", "-i", pemFile, source, destination];
        exec(command.join(" "), function (err, stdout, stderr) {
            if (err)
                console.log(err);
            else {
                console.log("Downloaded data from", url);
                if (typeof callback == "function") {
                    callback(stdout);
                }
            }
        });
    });
}
function manipulationCheck(batch) {
    fs.readFile(dir + batch + "/" + "users.json", function (err, usersJSON) {
        if (err) {
            return console.log(err);
        }
        else {
            try {
                var users = JSON.parse(String(usersJSON));
                var results = {
                    batch: batch,
                    condition: users[0].results.condition,
                    format: users[0].results.format,
                    empty: users.filter(function (user) { return user.results.manipulationCheck.length === 0; }).length,
                    correct: users.filter(function (user) {
                        return user.results.manipulationCheck["1"] === user.results.manipulation;
                    }).length,
                    total: users.length
                };
                if (results.format.length === 4 &&
                    results.condition === "treatment" &&
                    results.total >= 9) {
                    console.log(results);
                }
                return results;
            }
            catch (err) {
                console.log("File ending error in batch", batch, JSON.parse(String(usersJSON)));
            }
        }
    });
}
function manipulationFix(batch) {
    fs.readFile(dir + batch + "/" + "users.json", function (err, usersJSON) {
        if (err) {
            return console.log(err);
        }
        else {
            try {
                var users = JSON.parse(String(usersJSON));
                var newUsers = users.map(function (u) {
                    if (u.results.manipulationCheck === "") {
                        u.results.manipulationCheck = { "1": null };
                    }
                    console.log(u.results.manipulationCheck);
                    return u;
                });
                fs.writeFile(dir + batch + "/" + "users.json", JSON.stringify(newUsers, null, 2), function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    else {
                        /* console.log("saved",f); */
                    }
                });
            }
            catch (err) {
                console.log("File ending error in batch", batch, JSON.parse(String(usersJSON)));
            }
        }
    });
}
function useCompleteBatches(callback) {
    var batchFolders = fs
        .readdirSync(dir)
        .filter(function (f) { return fs.statSync(dir + f).isDirectory(); });
    return batchFolders
        .filter(function (f) {
        return fs.readdirSync(dir + f).includes("users.json") &&
            fs.readdirSync(dir + f).includes("chats.json");
    })
        .filter(function (f) {
        fs.readFile(dir + f + "/" + "batch.json", function (err, batchJSON) {
            if (err) {
                console.log(err);
                return false;
            }
            else {
                var batch = JSON.parse(String(batchJSON))[0];
                if (batch) {
                    if (batch.batchComplete === true) {
                        if (typeof callback == "function") {
                            callback(batch.batchID);
                        }
                        return true;
                    }
                }
            }
        });
    });
}
var correctCount = 0;
var totalCount = 0;
// manipulationCheck(1537292004662)
// useCompleteBatches(manipulationCheck)
useCompleteBatches(manipulationFix);
//Save from servers
// downloadData("mark.dmorina.com",saveAllData)
// downloadData("bang.dmorina.com",saveAllData)
// downloadData("b01.dmorina.com",saveAllData)
// Save from local folder
// saveAllData()
// useEachBatchDB(renderAds)
// retroactiveBonus()
// retroactivelyFixRooms()
