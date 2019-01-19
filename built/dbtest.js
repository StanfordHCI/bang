var AWS = require("aws-sdk");
AWS.config.accessKeyId = process.env.AWS_ID;
AWS.config.secretAccessKey = process.env.AWS_KEY;
AWS.config.region = "us-east-1";
AWS.config.sslEnabled = true;
var dynamodb = new AWS.DynamoDB();
dynamodb.batchGetItem(params, function (err, data) {
    if (err)
        console.log(err, err.stack);
    // an error occurred
    else
        console.log(data); // successful response
});
