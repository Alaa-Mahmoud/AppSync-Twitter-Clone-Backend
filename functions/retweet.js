const DynamoDB = require('aws-sdk/clients/dynamodb');
const ulid = require('ulid');
const { TweetsType } = require('../lib/constants');

const DocumentClient = new DynamoDB.DocumentClient();
const { USERS_TABLE, TIMELINES_TABLE, TWEETS_TABLE, RETWEETS_TABLE } = process.env

async function retweet(event) {
  const { tweetId } = event.arguments;
  const { username } = event.identity;
  const id = ulid.ulid();
  const timestamp = new Date().toJSON();

  const getTweetResponse = await DocumentClient.get({
    TableName: TWEETS_TABLE,
    keys: { id: tweetId }
  }).promise();

  const tweet = getTweetResponse.Item;
  if (!tweet) {
    throw new Error('Tweet is not found');
  }

  const newTweet = {
    id,
    __typename: TweetsType.RETWEET,
    creator: username,
    retweetOf: tweetId,
    createdAt: timestamp
  };

  const transactItems = [{
    Put: {
      TableName: TWEETS_TABLE,
      Item: newTweet
    }
  }, {
    Put: {
      TableName: RETWEETS_TABLE,
      Item: {
        userId: username,
        tweetId,
        createdAt: timestamp,
      },
      ConditionExpression: 'attribute_not_exists(tweetId)'
    }
  }, {
    Update: {
      TableName: TWEETS_TABLE,
      Key: {
        id: tweetId
      },
      UpdateExpression: 'ADD retweets :one',
      ExpressionAttributeValues: {
        ':one': 1
      },
      ConditionExpression: 'attribute_exists(id)'
    }
  }, {
    Update: {
      TableName: USERS_TABLE,
      Key: {
        id: username
      },
      UpdateExpression: 'ADD tweetsCount :one',
      ExpressionAttributeValues: {
        ':one': 1
      },
      ConditionExpression: 'attribute_exists(id)'
    }
  }];

  console.log(`creator: [${tweet.creator}]; username: [${username}]`);

  if (tweet.creator !== username) {
    transactItems.push({
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          retweetOf: tweetId,
          timestamp
        }
      }
    });
  }

  await DocumentClient.transactWrite({
    TransactItems: transactItems
  }).promise();

  return newTweet;

}

module.exports.handler = retweet;
