import axios from 'axios';
import { UserMigrationTriggerEvent } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

/**
 * This gets the user from the previous pool if they exists.
 * If they do we can create a new user with the same credentials.  If they don't we throw an error and say ' user not found ' etc.
*/
const GetUserFromExistingPool = async (username: string, password: string) => {

    var data = {
        "AuthParameters": {
            "USERNAME": username,
            "PASSWORD": password
        },
        "AuthFlow": "USER_PASSWORD_AUTH",
        "ClientId": "70v2ru8d2tc8rnhfdcfaksnlu9" // this should be passed as an environment variable because this change in Test, UAT and Prod
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
        return response.data;
    } catch (err) {
        throw new Error("User not found");
    }
}

export const handler = async (event: UserMigrationTriggerEvent, context: any): Promise<any> => {
    console.log(event);

    if (event.triggerSource === "UserMigration_Authentication") {
        const userAuthenticationResult = await GetUserFromExistingPool(event.userName, event.request.password);
        const { IdToken } = userAuthenticationResult.AuthenticationResult;
        const decodedToken = jwt.decode(IdToken);

        const partyCode = decodedToken['custom:partycode'];
        const legacyAccountId = decodedToken['custom:accountid'];
        const legacyContactId = decodedToken['custom:contactid'];

        // sub: 'c31e1b3e-ec66-4212-9aad-f4e246d4c50a',
        // role: 'Account Holder',
        // email_verified: true,
        // 'custom:partycode': '500412',
        // iss: 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_rSv54iLJ1',
        // 'custom:accountid': '0011J000017nxD2QAI',
        // 'cognito:username': 'c31e1b3e-ec66-4212-9aad-f4e246d4c50a',
        // 'custom:contactid': '0031J00001ET2FOQA1',
        // aud: '70v2ru8d2tc8rnhfdcfaksnlu9',
        // event_id: '449c44bf-7129-416b-baeb-908c8b8f6fce',
        // token_use: 'id',
        // auth_time: 1664930476,
        // name: 'Steven',
        // exp: 1664934076,
        // iat: 1664930476,
        // email: 'test.digital03@novaenergy.co.nz'

        event.response.userAttributes = {
            ...event.response.userAttributes,
            "name": decodedToken['name'],
            "email": decodedToken.email,
            "email_verified": "true",
            "custom:partycode": partyCode,
            "custom:legacyaccountId": legacyAccountId,
            "custom:legacycontactId": legacyContactId
        };
        event.response.finalUserStatus = "CONFIRMED";
        event.response.messageAction = "SUPPRESS";
        context.succeed(event);
    }


};
