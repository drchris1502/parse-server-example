
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:



send = function(userID, soundFile, messageText, contentAvailable) {

var promise = new Parse.Promise();

console.log(userID);

if (contentAvailable === false) {
   console.log("false");
   var jsonBody = { 
     app_id: "d35d150a-0573-4c0b-a633-3867b7a08d45", 
     //included_segments: ["All"],
     tags: [{"key": "userID", "relation": "=", "value" : userID}],
     contents: {en: messageText},
     //data: {"Foo": "Bar"},
     ios_sound: soundFile,
     ios_badgeType: "Increase",
     ios_badgeCount: "1",
     content_available: contentAvailable
   };
} else {
   console.log("true");
   var jsonBody = { 
     app_id: "d35d150a-0573-4c0b-a633-3867b7a08d45", 
     contents: {en: ""},
     tags: [{"key": "userID", "relation": "=", "value" : userID}],
     ios_sound: "nil",
     content_available: contentAvailable
   };
}
console.log(jsonBody);
Parse.Cloud.httpRequest({
    method: "POST",
    url: "https://onesignal.com/api/v1/notifications",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Authorization": "Basic NTNmMDI5MmQtM2U5MS00OTE5LTg1ZjctYjU1YTg5NWI2NDhl"
    },
    body: jsonBody
  }).then(function (httpResponse) {
    promise.resolve(httpResponse)
  },
  function (httpResponse) {
    promise.reject(httpResponse);
});

return promise;
};

Parse.Cloud.define("hello", function(request, response) {
  send("Ydzt0n3KSr", "pst.caf", "Hello World", false).then(
     function(object) {
     	response.success("Hello world!");
     }, function(error) {
       console.log(error);
       response.success("Error");
     });
});


Parse.Cloud.beforeSave("Messages", function(request,response) {
 
if (request.object.get('pushed') === false) {
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('user', request.object.get('toId'));  // push to the right user!!!
    var partner = request.object.get('toId');
    var userQuery = new Parse.Query(request.user);
    var soundFile = 'default'
    userQuery.get(partner).then (function(partnerUser) {
       soundFile = partnerUser.get("soundFile") + '.caf';
    }).then (function() {
       send(request.object.get('toId'), soundFile, "You have a new message!", false).then(
       function(object) {
          request.object.set('pushed', true);
          response.success();
       }, function(error) {
          console.log(error);
          response.success();
       })
    });
} else if ((request.object.get('status') === 'R') || (request.object.get('type') === 'S')) {
   // the message was read and needs to be notified
   // or the message is a system message
   // send a silent push.
	
   //var query = new Parse.Query(Parse.Installation);
   //query.equalTo('user', request.object.get('toId'));  
   send(request.object.get('fromId'), "", "", true).then(
   function(object) {
      response.success();
   }, function(error) {
      console.log(error);
      response.success();
   })
} else  {     //  this has already been pushed...
    response.success();  // save the message as normal.
}
});



Parse.Cloud.define("acceptPairing", function(request, response) {
    // This routine will accept a pairing invitation:
    // Save the Sending User's ID and Nickname in the Accepting User's record
    // Save the Accepting User's ID and Nickname in the Sending User's record
    // Delete the pairing request.
    Parse.Cloud.useMasterKey();
    var userAcceptingInvitation = request.user;
    var pairingId = request.params.pairingId;
    var pairingToAccept;
    var userSendingInvitation;
    var queryForPairing = new Parse.Query("Pairing");
    queryForPairing.get(pairingId).then(function(pairing) {
        pairingToAccept = pairing;
        var fromUserId = pairing.get("fromUserId");
        var queryForSendingUser = new Parse.Query("User");
        return queryForSendingUser.get(fromUserId);
    }).then(function(sendingUser) {
        userSendingInvitation = sendingUser;
        userSendingInvitation.set("partnerId",userAcceptingInvitation.id);
        userSendingInvitation.set("partnerNickname", userAcceptingInvitation.get("nickname"));
        return userSendingInvitation.save();
    }).then(function(sendingUser) {
        console.log(userAcceptingInvitation.id);
        userAcceptingInvitation.set("partnerId", userSendingInvitation.id);
        userAcceptingInvitation.set("partnerNickname", userSendingInvitation.get("nickname"));
        return userAcceptingInvitation.save();
    }).then(function(acceptingUser) {
        pairingToAccept.destroy();
    }).then(function(pairingDeleted) {
        response.success("Invitation accepted and pairing completed.");
    }, function(error) {
        response.error(error);
    });
});

Parse.Cloud.define("unpair", function(request, response) {
    // This routine will unpair two accounts
    // Remove the partnerId and partnerNickname fields from both user records.
    Parse.Cloud.useMasterKey();
    var currentUser = request.user;
    var partnerUser;
    var currentUsersPartnerId = currentUser.get("partnerId");
    console.log(currentUsersPartnerId);
    var userQuery = new Parse.Query(request.user);
    userQuery.get(currentUsersPartnerId).then(function(user) {
       partnerUser = user;
        partnerUser.set("partnerId", "");
        partnerUser.set("partnerNickname", "");
        console.log(partnerUser);
        return partnerUser.save();
    }).then(function(saved) {
        currentUser.set("partnerId", "");
        currentUser.set("partnerNickname", "");
        console.log(currentUser);
        return currentUser.save();
    }).then(function(saved) {
       response.success("Accounts Unpaired.");
    }, function(error) {
        response.error(error);
    });
});

Parse.Cloud.beforeSave("Pairing", function(request,response) {
  var client = require('/app/cloud/myMailModule-1.0.0.js');
  client.initialize('whispers-app.com', 'key-1c722948f02cedebe15f2f827c57961f');
  var inviteHTML = require('/app/cloud/invitationHTML.js');
  var html1 = inviteHTML.HTMLpart1();
  var html2 = inviteHTML.HTMLpart2();
  var html3 = inviteHTML.HTMLpart3();
  var html4 = inviteHTML.HTMLpart4();
  var newPairing = request.object;
  // First Send the email to the invited partner
  var userQuery = new Parse.Query(request.user);
  userQuery.get(newPairing.get("fromUserId")).then(function(user) {
    client.sendEmail({
      to: newPairing.get("toUserEmail"),
      from: "invitations@whispers-app.com",
      subject: "You have an invitation to pair on Whispers!",
      text: "You have an invitation to pair on Whispers from "+ user.get("nickname") + " (" + newPairing.get("fromUserEmail") + ").  \n\nAll you need to do next is install Whispers and log in with the email address: " + newPairing.get("toUserEmail") + ". \n\nWhispers is currently in beta testing and should be installed from the Testflight app.  \nIf you need any assistance, please email whispers@whispers-app.com.",
      html: html1 + user.get("nickname") + html2 + newPairing.get("fromUserEmail") + html3 + newPairing.get("toUserEmail") + html4
    }).then(function(httpResponse) {
      console.log("Email sent!");
    }, function(httpResponse) {
      console.error(httpResponse);
      console.log("Uh oh, something went wrong");
    })
  }).then(function() {
    // Delete any duplicate pairing objects
    var Pairing = Parse.Object.extend("Pairing");
    var query = new Parse.Query(Pairing);
    query.equalTo("fromUserId", newPairing.get("fromUserId"));
    console.log("Here in Pairing");
    query.find({
      success: function(temp) {
          for (var i = 0; i < temp.length; i++) {
             var invitation = temp[i];
             invitation.destroy ({
               success: function(invitation) {
                 console.log("A previous invitation was deleted.");
               }
             });
          }
          response.success();
      },
      error: function(error) {
          response.success();
      }
    });
  });
});

Parse.Cloud.define("welcomeEmail", function(request, response) {
  var client = require('cloud/myMailModule-1.0.0.js');
  client.initialize('whispers-app.com', 'key-1c722948f02cedebe15f2f827c57961f');
  var email = request.params.email;
  var welcomeHTML = require('/app/cloud/welcomeHTML.js');
  var html = welcomeHTML.emailHTML();
  client.sendEmail({
    to: email,
    from: "welcome@whispers-app.com",
    subject: "Welcome to Whispers!",
    text: "Welcome to Whispers! \n\n  Thanks for registering with Whispers.  We're excited for you to start connecting more closely with your special someone!  The next thing you should do is go to the settings page in Whispers and select \'Send Pairing Invitation\'.  After your partner has logged in and accepted your invitation, you\'ll be set!",
    html: html
  }).then(function(httpResponse) {
    response.success("Email sent!");
  }, function(httpResponse) {
    console.error(httpResponse);
    response.error("Uh oh, something went wrong");
  })
});

Parse.Cloud.define("sendPoints", function(request,response) {
  var points = Number(request.params.points);
  Parse.Cloud.useMasterKey();
  var currentUser = request.user;
  var partnerUser;
  var currentUsersPartnerId = currentUser.get("partnerId");
  console.log(currentUsersPartnerId);
  var userQuery = new Parse.Query(request.user);
  userQuery.get(currentUsersPartnerId).then(function(user) {
     partnerUser = user;
     var startingPoints = partnerUser.get("points");
     if (!(typeof startingPoints == 'number')) {
       startingPoints = 0;
     }
     console.log(startingPoints);
     var newPoints = startingPoints + points;
     console.log(newPoints);
     partnerUser.set("points", newPoints);
     console.log(partnerUser);
     return partnerUser.save();
  }).then(function(saved) {
     response.success("Points Applied.");
  }, function(error) {
      response.error(error);
  });
});

