
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

//Takes clientEmail and photographerEmail
Parse.Cloud.define("addRecommendation", function(request, response) {
    Parse.Cloud.useMasterKey(); //bypasses ACL requirements

    //Get the client entry
    var client;
    var cquery = new Parse.Query(Parse.User);
    cquery.equalTo("email", request.params.clientEmail);
    cquery.first().then(function(c) { //Client query worked
        client = c;
        if (client == undefined) return Parse.Promise.error();
        else return Parse.Promise.when(client);
    }, function(error) { //Client query failed
        return Parse.Promise.error("Client lookup failed, please try again");
    }).then(function(client) { //Client found
        //Get the photographer entry
        var pquery = new Parse.Query("Photographer");
        pquery.equalTo("email", request.params.photographerEmail);
        return pquery.first();
    }, function(error) { //Client not found
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Invalid client");
    }).then(function(photographer) { //Photographer query worked
        console.log("photographer", photographer);
        if (photographer == undefined) return Parse.Promise.error();
        else return Parse.Promise.when(photographer);
    }, function(error) { //Photographer query failed
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Photographer lookup failed, please try again");
    }).then(function (photographer) { //Photographer found
        var recommendations = client.relation("photographers");
        recommendations.add(photographer);
        return client.save();
    }, function(error) { //Photographer not found
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Invalid photographer");
    }).then(function () { //Save successful
        response.success("Recommendation added");
    }, function (error) { //Save failed
        console.log(error);
        response.error(error);
    });
});

//Takes clientEmail and photographerEmail
Parse.Cloud.define("removeRecommendation", function(request, response) {
    Parse.Cloud.useMasterKey(); //bypasses ACL requirements

    //Get the client entry
    var client;
    var cquery = new Parse.Query(Parse.User);
    cquery.equalTo("email", request.params.clientEmail);
    cquery.first().then(function(c) { //Client query worked
        client = c;
        if (client == undefined) return Parse.Promise.error();
        else return Parse.Promise.when(client);
    }, function(error) { //Client query failed
        return Parse.Promise.error("Client lookup failed, please try again");
    }).then(function(client) { //Client found
        //Get the photographer entry
        var pquery = new Parse.Query("Photographer");
        pquery.equalTo("email", request.params.photographerEmail);
        return pquery.first();
    }, function(error) { //Client not found
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Invalid client");
    }).then(function(photographer) { //Photographer query worked
        console.log("photographer", photographer);
        if (photographer == undefined) return Parse.Promise.error();
        else return Parse.Promise.when(photographer);
    }, function(error) { //Photographer query failed
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Photographer lookup failed, please try again");
    }).then(function (photographer) { //Photographer found
        var recommendations = client.relation("photographers");
        recommendations.remove(photographer);
        return client.save();
    }, function(error) { //Photographer not found
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Invalid photographer");
    }).then(function () { //Save successful
        response.success("Recommendation removed");
    }, function (error) { //Save failed
        console.log(error);
        if (error) response.error(error);
        else response.error("Save failed, please try again");
    });
});

//Takes clientEmail
Parse.Cloud.define("viewRecommendations", function(request, response) {
    //Get the client entry
    var client;
    var cquery = new Parse.Query(Parse.User);
    cquery.equalTo("email", request.params.clientEmail);
    cquery.first().then(function(c) { //Client query worked
        client = c;
        if (client == undefined) return Parse.Promise.error();
        else return Parse.Promise.when(client);
    }, function(error) { //Client query failed
        return Parse.Promise.error("Client lookup failed, please try again");
    }).then(function(client) { //Client found
        //Get list of recommendations
        return client.relation("photographers").query().find();
    }, function(error) { //Client not found
        if (error) return Parse.Promise.error(error);
        else return Parse.Promise.error("Invalid client");
    }).then(function(recommendations) { //Recommendations found
        response.success(recommendations);
    }, function(error) { //Recommendations not found
        if (error) response.error(error);
        else response.error("Recommendation lookup failed, please try again");
    });
});

Parse.Cloud.define("sendContactEmail", function(request, response) {
  var sendgrid = require("sendgrid");
  sendgrid.initialize("SealTeamSix", "AS2015gcc");

  var name = request.params.name;
  var email = request.params.email;
  var phone = request.params.phone;
  var zip = request.params.zip;
  var mrgdate = request.params.mrgdate;

  var toCustomer = "Congratulations on your engagement, "+name+"!\n\nMy team and I wish you a wonderful wedding and a happy life together.\n\nIt can be a hassle to find a photographer that's talented, responsible, and fits your style. We'll take care of that by handpicking our photographers for your wedding. We're also offering substantial discounts for our first customers.\n\nTo book your wedding through us, we'd love to hear from you at (###)###-#### or me@example.com.";
  var toAdmin = "New contact submission:\n\nName: "+name+"\n\nEmail: "+email+"\n\nPhone: "+phone+"\n\nZipcode: "+zip+"\n\nWedding Date: "+mrgdate;

  //Send email to admin first because if there's an error after sending the second email and not the first, the user won't get an email from us even though the contact form said something was wrong
  sendgrid.sendEmail({
      to: "denchikam1@gcc.edu",
      from: "sendgrid@cloudcode.com",
      fromname: "Wedding Umbrella",
      subject: "Contact Request",
      text: toAdmin
  }).then(
      function(httpResponse) {
          console.log(httpResponse);
          return sendgrid.sendEmail({
              to: email,
              from: "sendgrid@cloudcode.com",
              fromname: "Wedding Umbrella",
              subject: "Congratulations!",
              text: toCustomer
          });
      },
      function(httpResponse) {
          console.error(httpResponse);
          response.error(httpResponse);
      }
  ).then( //Customer email sent
      function(httpResponse) {
          console.log(httpResponse);
          response.success("Email sent!");
      },
      function(httpResponse) {
          console.error(httpResponse);
          response.error(httpResponse);
      }
  );
});
