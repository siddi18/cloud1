/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/

var WildRydes = window.WildRydes || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId,
        client_secret: _config.cognito.client_secret,
    };

    var userPool;

    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region &&
          _config.cognito.client_secret)) {
        $('#noCognitoMessage').show();
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    WildRydes.signOut = function signOut() {
        userPool.getCurrentUser().signOut();
    };

    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

    console.log("congigg",_config.cognito);
    
// function getSecretHash(username) {
//     var message = username + _config.cognito.userPoolClientId;
//     var key = CryptoJS.HmacSHA256(message, _config.cognito.client_secret);
//     return CryptoJS.enc.Base64.stringify(key);
// }

function getSecretHash(username, clientId, clientSecret) {
    const message = username + clientId; // Username + Client ID
    const key = CryptoJS.HmacSHA256(message, clientSecret); // HMAC-SHA256 hash
    return CryptoJS.enc.Base64.stringify(key); // Base64 encode the hash
}

// Example Usage:
const username = "vincenzo1730@gmail.com";  // The Cognito username (usually email)
const clientId = "240burhsimmfp2f13dhmhf9g5o";   // Your Cognito App Client ID
const clientSecret = "1pdlshsghkme61fn2bo1f1v66bmntdoj3cj3a9b0vanfjrd3ct8r"; // Your Cognito App Client Secret

console.log("Secret Hash:", getSecretHash(username, clientId, clientSecret));



function register(email, password, onSuccess, onFailure) {
    var dataEmail = {
        Name: 'email',
        Value: email
    };
    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

    var secretHash = getSecretHash(username, clientId, clientSecret); // ✅ Generate SECRET_HASH
  // console.log("secret hash:", secretHash);
    userPool.signUp(
        toUsername(email),
        password,
        [attributeEmail], 
        null, // ✅ Ensure ValidationData is 'null' or an empty array []
        { SECRET_HASH: secretHash }, // ✅ Pass SECRET_HASH in clientMetadata
        function signUpCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                console.error("Signup Error: ", err); // ✅ Debug exact error
                onFailure(err);
            }
        }
    );
}




console.log(userPool.signUp.toString());



    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password,
            SecretHash: getSecretHash(email, poolData.ClientId, poolData.client_secret)
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
    });

    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        event.preventDefault();
        signin(email, password,
            function signinSuccess() {
                console.log('Successfully Logged In');
                window.location.href = 'ride.html';
            },
            function signinError(err) {
                alert(err);
            }
        );
    }

    function handleRegister(event) {
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();

        var onSuccess = function registerSuccess(result) {
            var cognitoUser = result.user;
            console.log('User name is ' + cognitoUser.getUsername());
            var confirmation = 'Registration successful. Please check your email inbox or spam folder for your verification code.';
            if (confirmation) {
                window.location.href = 'verify.html';
            }
        };
        var onFailure = function registerFailure(err) {
            alert(err);
        };
        event.preventDefault();

        if (password === password2) {
            register(email, password, onSuccess, onFailure);
        } else {
            alert('Passwords do not match');
        }
    }

    function handleVerify(event) {
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();
        event.preventDefault();
        verify(email, code,
            function verifySuccess(result) {
                console.log('Call result: ' + result);
                console.log('Successfully verified');
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                alert(err);
            }
        );
    }
}(jQuery));
