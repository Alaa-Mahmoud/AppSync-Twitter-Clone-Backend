require('dotenv').config();
const AWS = require('aws-sdk');

const user_exists_in_UsersTable = async (id) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  console.log(`looking for user [${id}] in table [${process.env.USERS_TABLE}]`);

  const response = await dynamodb.get({
    TableName: process.env.USERS_TABLE,
    Key: {
      id
    }
  }).promise();

  expect(response.Item).toBeTruthy();

  return response.Item;
};


module.exports = {
  user_exists_in_UsersTable
};
