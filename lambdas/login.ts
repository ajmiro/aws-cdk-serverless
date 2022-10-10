import { APIGatewayProxyEvent } from 'aws-lambda';
import axios from 'axios';

export const handler = async (event: APIGatewayProxyEvent): Promise<any> => {

    console.log(event);

    const { username, password } = JSON.parse(event.body!);

    var data = {
        "AuthParameters": {
            "USERNAME": username,
            "PASSWORD": password
        },
        "AuthFlow": "USER_PASSWORD_AUTH",
        "ClientId": "5q5f5ttrv0bj36gouc972qfb0l"
    };

    const config = {
        method: 'post',
        url: 'https://cognito-idp.ap-southeast-2.amazonaws.com/',
        headers: {
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            'Content-Type': 'application/x-amz-json-1.1'
        },
        data: data
    };

    try {
        const response = await axios(config)


        // grab the ID token as it contains the partyCode, accountId and contactId in legacy system
        console.log(JSON.stringify(response.data));

        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        }
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        }
    }


};


