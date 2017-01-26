Parse.initialize("QFwL0KBO8bNKnb1PKtF2a71BFvfbIVTD5xlbG1Ss", "2zKz98X7BnFka0Dd25tIY0ALkZk4oVlZy6HKBETU");

var PhotographerObject = Parse.Object.extend("Photographer");
var PhotoObject = Parse.Object.extend("Photo");
var UserObject = Parse.Object.extend("User");

var LogInNavView = Parse.View.extend({
    events: {
        "submit form#logout-form": "logOut"
    },

    el: $("#nav-loggedin"),

    logOut: function() {
        Parse.User.logOut();
        this.render();
    },

    initialize: function() {
        this.render();
    },

    render: function() {
        var self = this;
        var currentUser = Parse.User.current();
        if (currentUser) {
            $.get("/templates/nav-loggedin-template.html", function(navTemplate) {
                self.$el.html(_.template(navTemplate));
            });
        }
    }
});

var logInNavView = new LogInNavView;

function createNewPhotographer() {
    var testObject = new PhotographerObject();
    testObject.set("firstName", "Bob");
    testObject.set("lastName", "Marley");
    testObject.set("email", "me@example.com");
    testObject.save().then(function(object) {
        alert("yay! it worked");
    });
}

function getPhotographers(location) {
    var query = new Parse.Query(PhotographerObject);
    query.withinMiles("location", location, 20);
    query.find({
        success: function(results) {
            // results is an array of Parse.Object.
        },
        error: function(error) {
            // error is an instance of Parse.Error.
        }
    });
}

var LogInView = Parse.View.extend({
    events: {
        "submit form#login-form": "logIn"
    },

    el: "#user-portal",

    initialize: function() {
        _.bindAll(this, "logIn");
        this.render();
    },

    logIn: function(e) {
        var self = this;
        var username = this.$("#login-email").val();
        var password = this.$("#login-password").val();

        Parse.User.logIn(username, password, {
            success: function(user) {
                self.$("#login-form #response").removeClass(); //Remove previous alerts
                self.$("#login-form #response").html("");
                logInNavView.render(); //Update the navbar
                new UserView; //Update the user portal
            },

            error: function(user, error) {
                self.$("#login-form #response").addClass("alert alert-danger");
                self.$("#login-form #response").html("Invalid username or password. Please try again.");
                self.$("#login-form button").removeAttr("disabled");
            }
        });

        this.$("#login-form button").attr("disabled", "disabled");

        return false;
    },

    render: function() {
        var self = this;
        $.get("/templates/login-template.html", function(loginTemplate) {
            self.$el.html(_.template(loginTemplate));
        });
    }
});

var AdminView = Parse.View.extend({
    events: {
        "click button#recommend-add": "addRecommendation",
        "click button#recommend-remove": "removeRecommendation",
        "click button#recommend-view": "viewRecommendations",
        "click button#clear-view-alerts": "clearViewAlerts",
        "click button#clear-modify-alerts": "clearModifyAlerts"
    },

    el: "#user-portal",

    initialize: function() {
        this.render();
    },

    clearModifyAlerts: function() {
        this.$('#recommend-form #response').removeClass();
        this.$('#recommend-form #response').html("");
        return false;
    },

    clearViewAlerts: function() {
        this.$('#recommend-view-form #response').removeClass();
        this.$('#recommend-view-form #response').html("");
        return false;
    },

    success: function(msg) {
        if (msg === undefined) msg = "Operation completed";
        this.$('#recommend-form #response').removeClass(); //Clear any previous alerts
        this.$('#recommend-form #response').html(msg).addClass('alert alert-success').fadeIn(2000);
    },

    failure: function(msg) {
        if (msg === undefined) msg = "Sorry, something went wrong";
        this.$('#recommend-form #response').removeClass(); //Clear any previous alerts
        this.$('#recommend-form #response').html(msg).addClass('alert alert-danger').fadeIn(2000);
    },

    addRecommendation: function() {
        var self = this;
        data = {
            clientEmail: this.$("#recommend-form #client-email").val(),
            photographerEmail: this.$("#recommend-form #photog-email").val()
        }

        Parse.Cloud.run("addRecommendation", data).then(function() {
            self.success("Recommendation added");
        }, function(error) {
            console.log(error);
            self.failure(error.message);
        });

        return false;
    },

    removeRecommendation: function() {
        var self = this;
        data = {
            clientEmail: this.$("#recommend-form #client-email").val(),
            photographerEmail: this.$("#recommend-form #photog-email").val()
        }

        Parse.Cloud.run("removeRecommendation", data).then(function() {
            self.success("Recommendation removed");
        }, function(error) {
            console.log(error);
            self.failure(error.message);
        });

        return false;
    },

    viewRecommendations: function() {
        //Get rid of old results in case of failure
        this.$("#recommend-table").html("");

        data = {
            clientEmail: this.$("#recommend-view-form #client-email").val()
        }

        Parse.Cloud.run("viewRecommendations", data).then(function(recommendations) {
            //Alert user of success
            this.$('#recommend-view-form #response').removeClass(); //Clear any previous alerts
            this.$('#recommend-view-form #response').html("Recommendations found ("+recommendations.length+")").addClass('alert alert-success').fadeIn(2000);

            var self = this;
            $.get("/templates/photographer-result-template.html", function(resultTemplate) {
                var list = "";
                var enter = _.template(resultTemplate);
                _.each(recommendations, function(photographer) {
                    list += enter({
                        firstname: photographer.get("firstName"),
                        lastname: photographer.get("lastName"),
                        email: photographer.get("email")
                    });
                });
                self.$("#recommend-table").html(list);
            });

        }, function(error) {
                this.$('#recommend-view-form #response').removeClass(); //Clear any previous alerts
                this.$('#recommend-view-form #response').html(error.message).addClass('alert alert-danger').fadeIn(2000);
        });

        return false;
    },

    render: function() {
        var self = this;
        $.get("/templates/admin-template.html", function(adminTemplate) {
            self.$el.html(_.template(adminTemplate));
        });
    }
});

var CoupleView = Parse.View.extend({
    el: "#user-portal",

    initialize: function() {
        this.render();
    },

    render: function() {
        var self = this;
        $.get("/templates/couple-template.html", function(coupleTemplate) {
            self.$el.html(_.template(coupleTemplate));
        });

        Parse.User.current().relation("photographers").query().find().then(function(recommendations) {
            if (recommendations.length > 0) {
                $.get("/templates/photographer-result-template.html", function(resultTemplate) {
                    var list = "";
                    var enter = _.template(resultTemplate);
                    _.each(recommendations, function(photographer) {
                        list += enter({
                            firstname: photographer.get("firstName"),
                            lastname: photographer.get("lastName"),
                            email: photographer.get("email")
                        });
                    });
                    self.$("#recommend-table").html(list);
                });
            }
            else {
                this.$('#response').removeClass(); //Clear any previous alerts
                this.$('#response').html("You have no photographer recommendations. Please try again later or contact us.").addClass('alert alert-warning').fadeIn(2000);
            }
        }, function(error) {
            this.$('#response').removeClass(); //Clear any previous alerts
            this.$('#response').html("Sorry, something went wrong. Please try again.").addClass('alert alert-danger').fadeIn(2000);
        });
    }
});

var UserView = Parse.View.extend({
    el: $("#user-portal"), //Bind to the existing structure

    initialize: function() {
        this.render();
    },

    render: function() {
        var currentUser = Parse.User.current();

        if (currentUser) { //User is logged in
            var query = (new Parse.Query(Parse.Role));
            query.equalTo("name", "Administrator");
            query.equalTo("users", currentUser);
            query.first().then(function(adminRole) {
                if (adminRole) { //User is an admin
                    console.log("user is an admin");
                    new AdminView();
                } else { //User is not an admin
                    console.log("user is not an admin");
                    new CoupleView();
                }
            });
        }
        else { //User is not logged in
            new LogInView;
        }
    }
});

var ContactView = Parse.View.extend({
    events: {
        "submit form#contact-form": "submitContact"
    },

    el: $("#contact-portal"),

    submitContact: function(e) {
        e.preventDefault();

        function success(msg) {
            if (msg === undefined) msg = "Thank you! We'll be in contact.";
            this.$('#contact-form #submit').remove(); //User is done with the submit button
            this.$('#contact-form #response').removeClass(); //Clear any previous alerts
            this.$('#contact-form #response').html(msg).addClass('alert alert-success').fadeIn(2000);
        }
        function failure(msg) {
            if (msg === undefined) msg = "Sorry, something went wrong. Please check your information and try again.";
            this.$('#contact-form #response').removeClass(); //Clear any previous alerts
            this.$('#contact-form #response').html(msg).addClass('alert alert-danger').fadeIn(2000);
        }

        var data = {
            name: this.$('#contact-form #name').val(),
            email: this.$('#contact-form #email').val(),
            passwd: this.$('#contact-form #password').val(),
            phone: this.$('#contact-form #phone').val(),
            zip: this.$('#contact-form #zip').val()
        };

        var dateString = this.$('#contact-form #mrgdate').val();
        var weddingDate = new Date(dateString);
        if (dateString != "" && (isNaN(weddingDate.getTime()) || weddingDate < new Date())) {
            failure("Sorry, that's an invalid date. Use only future dates in the format yyyy-mm-dd or mm/dd/yyyy.");
            return false;
        }
        else if (dateString != "") data.mrgdate = weddingDate;

        //Send email before creating user for two reasons:
        // 1. If there's an error sending the email, then an account isn't created and the user doesn't receive an "email taken" error upon resubmission.
        // 2. If the user fills out the form with the same email (because of a second wedding, missed the first email and wants a new one, etc.), then a second email is sent.
        Parse.Cloud.run("sendContactEmail", data).then(
            function() {
                return createNewUser(data.name, data.email, data.passwd, data.phone, data.mrgdate, data.zip);
            },
            function(error) {
                console.log(error);
                failure();
            }
        ).then( //User created
            function() {
                success();
            },
            function(error) {
                if (error.code === Parse.Error.USERNAME_TAKEN || error.code === Parse.Error.EMAIL_TAKEN) {
                    success("That email has already been taken, but we'll send out another email for you.");
                }
                else if (error.code === Parse.Error.INVALID_EMAIL_ADDRESS) {
                    failure("Sorry, your email address is invalid. Please try again.");
                }
                else failure();
            }
        );
    },

    initialize: function() {
        this.render();
    },

    render: function() {
        var self = this;
        $.get("/templates/contact-template.html", function(contactTemplate) {
            self.$el.html(_.template(contactTemplate));
        });
    }
});

var ZipcodeView = Parse.View.extend({
    events: {
        "submit form#zipcode-form": "checkZipcode"
    },

    el: "#zipcode-portal",

    initialize: function() {
        this.render();
    },

    checkZipcode: function() {
        var clearAlerts = function() {
            this.$("#near-response").addClass("hidden");
            this.$("#far-response").addClass("hidden");
            this.$("#error-response").addClass("hidden");
        };

        var geocoder = new google.maps.Geocoder();
        var self = this;
        var address = this.$("#zipcode-form #zipcode").val();
        geocoder.geocode({ 'address': address}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) { //Found zip coordinates
                var userZip = new Parse.GeoPoint(results[0].geometry.location.lat(), results[0].geometry.location.lng());
                var query = new Parse.Query("Sites");
                query.withinMiles("Location", userZip, 50); //within 50 miles
                query.first().then(function(site) { //Checked site locations
                    if (site == undefined) { //No sites near zip
                        clearAlerts();
                        self.$("#far-response").removeClass("hidden");
                    }
                    else { //At least one site near zip
                        clearAlerts();
                        self.$("#near-response").removeClass("hidden");
                    }
                }, function (error) { //Failed to check locations
                    clearAlerts();
                    self.$("#error-response").removeClass("hidden");
                });
            }
            else { //Failed to find zip coordinates
                clearAlerts();
                self.$("#error-response").removeClass("hidden");
            }
        });

        return false;
    },

    render: function() {
        var self = this;
        $.get("/templates/zipcode-template.html", function(zipcodeTemplate) {
            self.$el.html(_.template(zipcodeTemplate));
        });
    }
});

function generatePassword(length) {
    var pass = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i=0; i < length; i++) {
        pass += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return pass;
}

//Returns a Parse.Object.save() promise
function createNewUser(name, email, passwd, phone, date, zip) {
    var newUser = new UserObject();
    newUser.set("username", email);
    newUser.set("password", passwd);
    newUser.set("name", name);
    newUser.set("email", email);
    if (phone != "") newUser.set("phone", phone);
    if (date != "") newUser.set("weddingDate", date);
    newUser.set("zipCode", zip);
    return newUser.signUp();
}

$(document).ready(function() {
    if ($("#contact-portal").length > 0) new ContactView;
    if ($("#user-portal").length > 0) new UserView;
    if ($("#zipcode-portal").length > 0) new ZipcodeView;
});
